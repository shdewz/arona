import { ChatInputCommandInteraction } from 'discord.js';
import userModel from '../../models/user_schema.js';
import * as osu from '../../helpers/osu.js';
import * as tools from '../../helpers/osu-tools.js';
import * as moment from 'moment';
import * as numeral from 'numeral';

module.exports = async (interaction: ChatInputCommandInteraction) => {
    let query = interaction.options.getString('user') || (await userModel.findOne({ user_id: interaction.member.user.id }))?.osu_id;
    if (!query) return interaction.editReply('You have not linked your account yet! Do it with the `/set osu:[user]` command.');
    let mode = interaction.options.getString('mode') || 'osu';
    let modetext = mode == 'osu' ? '' : mode == 'fruits' ? 'catch' : mode;

    let user = await osu.getUser(query, mode);
    if (!user || user.error) return interaction.editReply(`User **${user}** not found!`);
    let stats = user.statistics;
    let rank_delta = !stats.global_rank ? null : user.rank_history.data[Math.floor(user.rank_history.data.length * (2 / 3))] - stats.global_rank;

    let lines = [
        {
            separator: ' ', indent: '> ',
            content: [
                !stats.global_rank ? null : `**Rank:** \`#${format(stats.global_rank, '0,0')}`,
                `(#${format(stats.country_rank, '0,0')} ${user.country_code})\``,
                rank_delta == 0 ? null : `${tools.getEmote(rank_delta > 0 ? 'increase' : 'decrease').emoji}**${format(Math.abs(rank_delta), '0.[0]a')}**`
            ]
        },
        {
            separator: ' \u200b \u200b ', indent: '> ',
            content: [
                !stats.pp ? null : `**PP:** \`${format(stats.pp, '0,0')}\``,
                `**Acc:** \`${stats.hit_accuracy.toFixed(2)}%\``
            ]
        },
        {
            separator: ' \u200b \u200b ', indent: '> ',
            content: [
                `**Level:** \`${stats.level.current}.${stats.level.progress}\``,
                user.scores_first_count > 0 ? `**#1s:** \`${format(user.scores_first_count, '0,0')}\`` : null
            ]
        },
        user.badges.length == 0 ? null : {
            separator: '', indent: '> ', content: [`**Badges:** \`${user.badges.length}\``]
        },
        { separator: '', indent: '', content: ['\u200b'] },
        {
            separator: '', indent: '> ',
            content: [`**Playcount:** \`${format(stats.play_count, '0,0')} (${format(Math.round(stats.play_time / 60 / 60), '0,0')} h)\``]
        },
        {
            separator: '', indent: '> ',
            content: [`**Ranked score:** \`${format(stats.ranked_score, '0,0')}\``]
        },
        user.ranked_beatmapset_count == 0 ? null : {
            separator: '', indent: '> ', content: [`**Ranked mapsets:** \`${user.ranked_beatmapset_count}\``]
        },
        {
            separator: ' ', indent: '> ',
            content: [
                `${tools.getEmote('XH').emoji} **${stats.grade_counts.ssh}**`,
                `${tools.getEmote('X').emoji} **${stats.grade_counts.ss}**`,
                `${tools.getEmote('SH').emoji} **${stats.grade_counts.sh}**`,
                `${tools.getEmote('S').emoji} **${stats.grade_counts.s}**`,
                `${tools.getEmote('A').emoji} **${stats.grade_counts.a}**`,
            ]
        },
        !user.twitter && !user.discord ? null : { separator: '', indent: '', content: ['\u200b'] },
        !user.twitter && !user.discord ? null : {
            separator: ' • ', indent: '> ',
            content: [
                user.discord ? `${tools.getEmote('discord').emoji} **${user.discord}**` : null,
                user.twitter ? `${tools.getEmote('twitter').emoji} **[${user.twitter}](https://twitter.com/${user.twitter})**` : null,
            ]
        },
    ];

    await interaction.editReply({
        embeds: [{
            color: !user.profile_colour ? null : parseInt(user.profile_colour.substr(1), 16),
            author: {
                name: `osu!${modetext} profile for ${user.username}`,
                icon_url: `https://assets.ppy.sh/old-flags/${user.country_code}.png`,
                url: `https://osu.ppy.sh/users/${user.id}/${mode}`,
            },
            title: !user.title ? '' : user.title,
            description: lines.filter(e => e).map(line => line.indent + line.content.filter(e => e).join(line.separator)).join('\n'),
            thumbnail: { url: user.avatar_url },
            // footer: {
            //     icon_url: `https://shdewz.me/assets/icons/${user.is_online ? 'online.png' : 'offline.png'}`,
            //     text: user.is_online ? 'Currently online' : user.last_visit == null ? '' : `Last online ${moment.utc(user.last_visit).fromNow()}`
            // }
        }]
    });
}

const format = (num: number, format: string) => numeral(num).format(format);