import * as osu from '../../helpers/osu.js';
import * as tools from '../../helpers/osu-tools.js';
import * as moment from 'moment';
import * as numeral from 'numeral';

export const get = async (query: string, beatmap_id: string, mode: string, user_obj: any) => {
    let user_osu = await osu.getUser(query, mode);
    let user = isNaN(Number(query)) ? user_osu.id : query;
    if (!user) return { error: `User **${user}** not found!` };

    let scores_ = await osu.getBeatmapScores(beatmap_id, user, mode);
    if (scores_.error) return { error: scores_.error };
    if (scores_.length == 0) return { error: `No scores found for **${user}** on **${beatmap_id}**.` };

    scores_.sort((a, b) => b.pp - a.pp);
    let scores = scores_.slice(0, Math.min(5, scores_.length));
    let mods = scores[0].mods.length == 0 ? 'NM' : scores[0].mods.join('');
    let beatmap = await osu.getBeatmap(beatmap_id, { mods: mods, calc_diff: false, lb: false });

    let s = scores[0].statistics;
    let options = [
        { mods: tools.reverseMods(mods, false), n300: s.count_300, n100: s.count_100, n50: s.count_50, nMisses: s.count_miss, combo: scores[0].max_combo },
        { mods: tools.reverseMods(mods, false), n300: s.count_300 + s.count_miss, n100: s.count_100, n50: s.count_50, nMisses: 0 },
        ...scores.slice(1, Math.min(5, scores_.length)).map(sc => ({ mods: tools.reverseMods(sc.mods.length == 0 ? 'NM' : sc.mods.join(''), false) }))
    ];
    let diff = await tools.diffCalc(beatmap_id, options);

    // add pb
    let personal_best = null;
    if (scores[0].best_id) {
        let topscores = await osu.getUserScores(user, mode, 'best', 100);
        let score_match = topscores.findIndex(sc => sc.id == scores[0].best_id);
        if (score_match !== -1) personal_best = score_match + 1;
    }

    let i = 0;
    scores.map(sc => {
        sc.fc = tools.guessFc(beatmap, sc.max_combo, sc.statistics);
        sc.modstr = sc.mods.length == 0 ? 'NM' : sc.mods.join('');
        sc.pps = i == 0 ? [diff[0], diff[1]] : diff[i + 1];
        sc.pptext = i == 0 ?
            `**${format(sc.pp || sc.pps[0].pp, '0,0')}pp**${!sc.fc ? '/' + format(sc.pps[1].pp, '0,0') + 'pp' : ''}` :
            `${format(sc.pp || sc.pps.pp, '0,0')}pp`;
        i++;
        return sc;
    });

    let lines = [
        {
            separator: ' • ', indent: '', content: [
                `**Top score for [${user_osu.username}](https://osu.ppy.sh/users/${user_osu.id})**`,
                personal_best ? `**#${personal_best}** Personal Best` : null
            ]
        },
        {
            separator: ' • ', indent: '> ',
            content: [
                `${tools.getEmote(scores[0].rank).emoji} **[+${scores[0].modstr}](https://osu.ppy.sh/scores/osu/${scores[0].best_id})** (${format(scores[0].pps[0]?.stars || 0, '0,0.00')}★)`,
                format(scores[0].accuracy, '0.00%'),
                scores[0].accuracy < 1 ? ` ${[
                    s.count_100 ? `**${s.count_100}** ${tools.getEmote('hit100').emoji} ` : null,
                    s.count_50 ? `**${s.count_50}**${tools.getEmote('hit50').emoji}` : null,
                    s.count_miss ? `**${s.count_miss}**${tools.getEmote('miss').emoji}` : null,
                ].filter(e => e).join('/ ')}` : null,
            ]
        },
        {
            separator: ' • ', indent: '> ',
            content: [
                scores[0].pptext || null,
                `**x${format(scores[0].max_combo, '0,0')}**/${format(beatmap.max_combo, '0,0')}`,
                format(scores[0].score, '0,0')
            ]
        },
        {
            separator: ' • ', indent: '> ',
            content: [`Score set <t:${Math.floor(moment.utc(scores[0].created_at).valueOf() / 1000)}:R>`]
        },
        scores.length > 1 ? { separator: '', indent: '', content: ['\u200b'] } : null,
        scores.length > 1 ? { separator: '', indent: '', content: ['**Other scores:**'] } : null,
        ...scores.slice(1, scores.length).map(sc => ({
            separator: ' • ', indent: '> ',
            content: [
                `${tools.getEmote(sc.rank).emoji} **[+${sc.modstr}](https://osu.ppy.sh/scores/osu/${sc.best_id})** ${sc.pptext}`,
                `**${format(sc.accuracy, '0.00%')}** x${format(sc.max_combo, '0,0')}`,
                sc.statistics.count_miss ? `**${sc.statistics.count_miss}**${tools.getEmote('miss').emoji}` : null,
                `<t:${Math.floor(moment.utc(sc.created_at).valueOf() / 1000)}:R>`
            ]
        })),
        scores_.length > 5 ? { separator: '', indent: '', content: [`**+${scores_.length - 5} more**`] } : null,
    ];

    let obj: any = {
        embed: {
            color: tools.getEmote(scores[0].rank).color,
            author: {
                name: `${beatmap.beatmapset.artist} - ${beatmap.beatmapset.title} [${beatmap.version}]`,
                icon_url: `https://a.ppy.sh/${user_osu.id}?${new Date().valueOf()}`,
                url: `https://osu.ppy.sh/users/${user_osu.id}`,
            },
            thumbnail: user_obj?.prefs?.score_style == 'compact' ? { url: beatmap.beatmapset.covers['list'] } : null,
            image: user_obj?.prefs?.score_style == 'compact' ? null : { url: beatmap.beatmapset.covers['cover'] },
            description: lines.filter(e => e).map(line => line.indent + line.content.filter(e => e).join(line.separator)).join('\n'),
            footer: {
                icon_url: `https://osu.ppy.sh/wiki/images/shared/status/${beatmap.beatmapset.status}.png`,
                text: `${beatmap.beatmapset.status} (${beatmap.beatmapset.creator}, ${mapdate(beatmap.beatmapset)})`
            }
        }
    };

    return obj;
}

const format = (num: number, format: string) => numeral(num).format(format);
const mapdate = mapset => moment.utc(mapset.ranked_date || mapset.submitted_date).format('yyyy');
