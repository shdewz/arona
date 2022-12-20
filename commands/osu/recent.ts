import { ChatInputCommandInteraction } from 'discord.js';
import userModel from '../../models/user_schema.js';
import * as osu from '../../helpers/osu.js';
import * as tools from '../../helpers/osu-tools.js';
import * as moment from 'moment';
import * as numeral from 'numeral';

module.exports = async (interaction: ChatInputCommandInteraction) => {
    let user_obj = await userModel.findOne({ user_id: interaction.member.user.id });
    let query = interaction.options.getString('user') || user_obj?.osu_id;
    if (!query) return interaction.editReply('You have not linked your account yet! Do it with the `/set osu:[user]` command.');
    let mode = interaction.options.getString('mode') || 'osu';
    let modetext = mode == 'osu' ? '' : mode == 'fruits' ? 'catch' : mode;
    let index = Math.min(100, interaction.options.getInteger('index') || 1) - 1;
    let type = interaction.options.getBoolean('best') ? 'best' : 'recent';
    let pass = interaction.options.getBoolean('pass');

    let user = isNaN(query) ? (await osu.getUser(query, mode)).id : query;
    if (!user) return interaction.editReply(`User **${user}** not found!`);

    let scores = await osu.getUserScores(user, mode, type, 100);
    if (scores.error) return interaction.editReply(scores.error.charAt(0).toUpperCase() + scores.error.slice(1));
    if (scores.length == 0) return interaction.editReply('No recent scores found for this player.');

    scores.map((sc, i) => { sc.index = i; return sc; });
    let score =
        type == 'best' ? scores.sort((a, b) => moment(b.created_at).valueOf() - moment(a.created_at).valueOf())[index] :
            pass ? scores.filter(sc => sc.passed === true)[index] :
                scores[index];
    if (!score) return interaction.editReply('No recent scores found for this player with specified criteria.');
    if (type == 'recent') score.try = tryCount(scores, pass ? scores.findIndex(sc => sc.id == score.id) : index);
    let mods = score.mods.length == 0 ? 'NM' : score.mods.join('');
    let pptext = `**${format(score.pp, '0,0')}pp**`;
    score.map = await osu.getBeatmap(score.beatmap.id, { mods: mods, calc_diff: false, lb: false }); // https://github.com/ppy/osu-web/issues/8101
    let s = score.statistics;
    let c = completion(score.statistics, score.map);

    // add pb and global rank
    let personal_best = null;
    let global_rank = null;
    if (score.passed === true && type == 'recent' && score.best_id) {
        let topscores = await osu.getUserScores(user, mode, 'best', 100);
        let score_match = topscores.findIndex(sc => sc.id == score.best_id);
        let fullscore = (await osu.getScore(score.best_id, mode))?.rank_global;
        if (score_match !== -1) personal_best = score_match + 1;
        if (fullscore) global_rank = fullscore;
    }

    const options = [
        { mods: tools.reverseMods(mods, false), n300: s.count_300, n100: s.count_100, n50: s.count_50, nMisses: s.count_miss, combo: score.max_combo },
        { mods: tools.reverseMods(mods, false), n300: s.count_300 + s.count_miss, n100: s.count_100, n50: s.count_50, nMisses: 0 }
    ];

    if (mode == 'osu') {
        score.fc = tools.guessFc(score.map, score.max_combo, score.statistics);
        score.pps = await tools.diffCalc(score.beatmap.id, options);
        pptext = `**${format(score.pp || score.pps[0].pp, '0,0')}pp**${!score.fc ? '/' + format(score.pps[1].pp, '0,0') + 'pp' : ''}`;
    }

    let lines = [
        {
            separator: ' ', indent: '',
            content: [
                type == 'best' ? `**${score.index + 1}.**` : null,
                `**[${score.beatmapset.title} [${score.beatmap.version}]](https://osu.ppy.sh/beatmaps/${score.beatmap.id})**`,
                `**+${mods}**`,
                score.pps ? ' (' + format(score.pps[0].stars, '0,0.00') + '★)' : null
            ]
        },
        personal_best || global_rank ? {
            separator: ' • ', indent: '> ',
            content: [
                personal_best ? `:medal: **#${personal_best} Personal Best**` : null,
                global_rank ? `:globe_with_meridians:  **#${format(global_rank, '0,0')} Global**` : null,
            ]
        } : null,
        {
            separator: ' • ', indent: '> ',
            content: [
                tools.getEmote(score.rank).emoji,
                pptext || null,
                format(score.accuracy, '0.00%'),
                score.accuracy < 1 ? ` ${[
                    s.count_100 ? `**${s.count_100}** ${tools.getEmote('hit100').emoji} ` : null,
                    s.count_50 ? `**${s.count_50}**${tools.getEmote('hit50').emoji}` : null,
                    s.count_miss ? `**${s.count_miss}**${tools.getEmote('miss').emoji}` : null,
                ].filter(e => e).join('/ ')}` : null,
            ]
        },
        {
            separator: ' • ', indent: '> ',
            content: [
                `<t:${Math.floor(moment.utc(score.created_at).valueOf() / 1000)}:R>`,
                `**x${format(score.max_combo, '0,0')}**/${format(score.map.max_combo, '0,0')}`,
                format(score.score, '0,0')
            ]
        }, score.rank !== 'F' ? null :
            {
                separator: ' • ', indent: '> ',
                content: [
                    `\`${'█'.repeat(Math.floor(c * 10)) + ' '.repeat(10 - Math.floor(c * 10))}\` ${format(c, '0%')} completion`
                ]
            }
    ];

    await interaction.editReply({
        embeds: [{
            color: tools.getEmote(score.rank).color,
            author: {
                name: `${index == 0 ? 'M' : `${format(index + 1, '0o')} m`}ost recent osu!${modetext} ${type == 'best' ? ' top score' : pass ? 'pass' : 'score'} for ${score.user.username}`,
                icon_url: `https://a.ppy.sh/${score.user.id}?${new Date().valueOf()}`,
                url: `https://osu.ppy.sh/users/${score.user.id}`,
            },
            thumbnail: user_obj?.prefs?.score_style == 'compact' ? { url: score.beatmapset.covers['list'] } : null,
            image: user_obj?.prefs?.score_style == 'compact' ? null : { url: score.beatmapset.covers['cover'] },
            description: lines.filter(e => e).map(line => line.indent + line.content.filter(e => e).join(line.separator)).join('\n'),
            footer: {
                icon_url: `https://osu.ppy.sh/wiki/images/shared/status/${score.beatmapset.status}.png`,
                text: `${score.beatmapset.status} (${score.beatmapset.creator}, ${mapdate(score.map.beatmapset)})${type == 'recent' ? ` • try #${score.try}` : ''}`
            }
        }]
    });
}

const format = (num: number, format: string) => numeral(num).format(format);
const mapdate = mapset => moment.utc(mapset.ranked_date || mapset.submitted_date).format('yyyy');
const completion = (h: hitCount, m) => (h.count_300 + h.count_100 + h.count_50 + h.count_miss) / (m.count_circles + m.count_sliders + m.count_spinners);

const tryCount = (scores: any[], index: number) => {
    let tries = 0;
    let reference = scores[index];
    scores.splice(0, index);
    for (const score of scores) {
        if (score.beatmap.id == reference.beatmap.id && score.mods.join('') == reference.mods.join('')) tries++;
        else break;
    }
    return tries;
}
