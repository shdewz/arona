import { ChatInputCommandInteraction } from 'discord.js';
import userModel from '../../models/user_schema.js';
import channelModel from '../../models/channel_schema.js';
import * as osu from '../../helpers/osu.js';
import * as tools from '../../helpers/osu-tools.js';
import * as moment from 'moment';
import * as numeral from 'numeral';
const page_length = 5;

module.exports = async (interaction: ChatInputCommandInteraction) => {
    let user_obj = await userModel.findOne({ user_id: interaction.member.user.id });
    let query = interaction.options.getString('user') || user_obj?.osu_id;
    if (!query) return interaction.editReply('You have not linked your account yet! Do it with the `/set osu:[user]` command.');
    let mode = interaction.options.getString('mode') || null;
    let page = interaction.options.getInteger('page') || 1;
    let reverse = interaction.options.getBoolean('reverse') || false;
    let sort_method = interaction.options.getString('sort') || 'pp';
    let search = interaction.options.getString('search')?.toLowerCase() || null;
    let modquery = interaction.options.getString('mods')?.toUpperCase() || null;

    let osu_user = await osu.getUser(query, mode);
    let user = isNaN(query) ? osu_user.id : query;
    if (!user) return interaction.editReply(`User **${user}** not found!`);
    if (!mode) mode = osu_user.playmode;
    let modetext = mode == 'osu' ? '' : mode == 'fruits' ? 'catch' : mode;

    let scores = await osu.getUserScores(user, mode, 'best', 100);
    if (scores.error) return interaction.editReply(scores.error.charAt(0).toUpperCase() + scores.error.slice(1));
    if (scores.length == 0) return interaction.editReply('No top scores found for this player.');
    scores.map((sc, i) => { sc.index = i; return sc; });

    // search
    if (search) {
        scores = scores.filter(sc => `${sc.beatmapset.artist} - ${sc.beatmapset.title} [${sc.beatmap.version}]`.toLowerCase().includes(search));
        if (scores.length == 0) return interaction.editReply('No scores found with specified search criteria.');
    }

    // mod filter
    let mqtype = '';
    let mqmods = [];
    if (modquery) {
        mqmods = modquery.match(/[A-Z]{2}/g);
        if (modquery.match(/^\+[A-Z]+!$/)) {
            mqtype = 'Limited to';
            scores = scores.filter(sc => sc.mods.sort().join('') == mqmods.sort().join(''));
        }
        else if (modquery.match(/^\-[A-Z]+$/)) {
            mqtype = 'Excluding';
            scores = scores.filter(sc => mqmods.every(e => !sc.mods.includes(e)));
        }
        else {
            mqtype = 'Including';
            scores = scores.filter(sc => mqmods.every(e => sc.mods.includes(e)));
        }
        if (scores.length == 0) return interaction.editReply('No scores found with specified search criteria.');
    }

    // sorting
    scores = scores.sort((a, b) => {
        switch (sort_method) {
            case 'pp': return b.pp - a.pp;
            case 'date': return moment(b.created_at).valueOf() - moment(a.created_at).valueOf();
            case 'accuracy': return b.accuracy - a.accuracy;
            case 'map date': return moment(b.beatmap.last_updated).valueOf() - moment(a.beatmap.last_updated).valueOf();
            default: return;
        }
    });
    if (reverse) scores = scores.reverse();

    let l_scores = scores.slice((page - 1) * page_length, page * page_length);
    for (let i in l_scores) {
        let modstr = l_scores[i].mods.length == 0 ? 'NM' : l_scores[i].mods.join('');
        l_scores[i].modstr = modstr;
        l_scores[i].map = await osu.getBeatmap(l_scores[i].beatmap.id, { mods: modstr, calc_diff: false, lb: false });
        let s = l_scores[i].statistics;

        const options = [{ mods: tools.reverseMods(modstr, false), n300: s.count_300 + s.count_miss, n100: s.count_100, n50: s.count_50, nMisses: 0 }];

        l_scores[i].fc = tools.guessFc(l_scores[i].map, l_scores[i].max_combo, s);
        l_scores[i].pps = await tools.diffCalc(l_scores[i].beatmap.id, options);
        l_scores[i].pptext = `**${format(l_scores[i].pp || 0, '0,0')}pp**${!l_scores[i].fc ? '/' + format(l_scores[i].pps[0].pp, '0,0') + 'pp' : ''}`;
    }

    let lines = [
        search ? { separator: '', indent: '', content: [`Matching **"${search}"**`] } : null,
        modquery ? { separator: '', indent: '', content: [`${mqtype} **${mqmods.join(mqtype == 'Limited to' ? '' : ', ')}**`] } : null,
        search || modquery ? { separator: '', indent: '', content: ['\u200b'] } : null,
        ...l_scores.map(score => {
            return [
                {
                    separator: '', indent: '', content: [
                        `**${score.index + 1}. [${score.beatmapset.title} [${score.beatmap.version}]](https://osu.ppy.sh/b/${score.beatmap.id})**`
                    ]
                },
                {
                    separator: ' • ', indent: '> ', content: [
                        `${tools.getEmote(score.rank).emoji} **[+${score.modstr}](https://osu.ppy.sh/scores/osu/${score.best_id})** (${format(score.pps[0]?.stars || 0, '0,0.00')}★)`,
                        format(score.accuracy, '0.00%'),
                        score.accuracy < 1 ? ` ${[
                            score.statistics.count_100 ? `**${score.statistics.count_100}** ${tools.getEmote('hit100').emoji} ` : null,
                            score.statistics.count_50 ? `**${score.statistics.count_50}**${tools.getEmote('hit50').emoji}` : null,
                            score.statistics.count_miss ? `**${score.statistics.count_miss}**${tools.getEmote('miss').emoji}` : null,
                        ].filter(e => e).join('/ ')}` : null,
                    ]
                },
                {
                    separator: ' • ', indent: '> ', content: [
                        score.pptext || null,
                        `**x${format(score.max_combo, '0,0')}**/${format(score.map.max_combo, '0,0')}`,
                        `<t:${Math.floor(moment.utc(score.created_at).valueOf() / 1000)}:R>`
                    ]
                }
            ]
        }).flat()
    ];

    await interaction.editReply({
        embeds: [{
            color: null,
            author: {
                name: `osu!${modetext} top scores for ${osu_user.username}`,
                icon_url: `https://assets.ppy.sh/old-flags/${osu_user.country_code}.png`,
                url: `https://osu.ppy.sh/users/${osu_user.id}/${mode}`,
            },
            thumbnail: { url: osu_user.avatar_url },
            description: lines.filter(e => e).map(line => line.indent + line.content.filter(e => e).join(line.separator)).join('\n'),
            footer: { text: `Page ${page}/${Math.ceil(scores.length / page_length)} • Sorted by ${sort_method}${reverse ? ' (reversed)' : ''}` }
        }]
    });

    // await channelModel.findOneAndUpdate({ id: interaction.channelId }, { last_beatmap: { id: score.beatmap.id, mode: mode } }, { upsert: true, new: true });
}

const format = (num: number, format: string) => numeral(num).format(format);
const mapdate = mapset => moment.utc(mapset.ranked_date || mapset.submitted_date).format('yyyy');
