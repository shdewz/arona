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
        !stats.global_rank ? null : {
            separator: ' • ', indent: '> ',
            content: [
                `**#${format(stats.global_rank, '0,0')}**`,
                `#${format(stats.country_rank, '0,0')} ${user.country_code}`,
                // `${tools.getEmote(rank_delta > 0 ? 'increase' : 'decrease').emoji} **${format(Math.abs(rank_delta), '0.[0]a')}**` // rank delta
            ]
        },
        {
            separator: ' • ', indent: '> ',
            content: [
                !stats.pp ? null : `**${format(stats.pp, '0,0')}** pp`,
                `**${stats.hit_accuracy.toFixed(2)}%** accuracy`
            ]
        },
        {
            separator: ' • ', indent: '> ',
            content: [
                `level **${stats.level.current}.${stats.level.progress}**`,
                user.scores_first_count > 0 ? `**${format(user.scores_first_count, '0,0')}** first place${plural(user.scores_first_count)}` : user.badges.length == 0 ? null : `**${user.badges.length}** badge${plural(user.badges.length)}`
            ]
        },
        user.badges.length == 0 || user.scores_first_count == 0 ? null : {
            separator: ' • ', indent: '> ', content: [`**${user.badges.length}** badge${plural(user.badges.length)}`]
        },
        !stats.global_rank ? null : {
            separator: ' • ', indent: '> ',
            content: [
                `peak **#${format(user.rank_highest.rank, '0,0')}** <t:${Math.round(moment.utc(user.rank_highest.updated_at).valueOf() / 1000)}:R>`,
            ]
        },
        { separator: '', indent: '', content: ['\u200b'] },
        {
            separator: ' • ', indent: '> ',
            content: [
                `**${format(stats.play_count, '0,0')}** playcount`,
                `**${format(Math.round(stats.play_time / 60 / 60), '0,0')}** hours`
            ]
        },
        {
            separator: ' • ', indent: '> ',
            content: [`**${format(stats.ranked_score, '0.00a')}** ranked score`, `**${format(stats.total_score, '0.00a')}** total`]
        },
        user.ranked_beatmapset_count == 0 ? null : {
            separator: '', indent: '> ', content: [
                `**${user.ranked_beatmapset_count}** ranked mapset${plural(user.ranked_beatmapset_count)}`
            ]
        },
        user.loved_beatmapset_count == 0 ? null : {
            separator: '', indent: '> ', content: [
                `**${user.loved_beatmapset_count}** loved mapset${plural(user.loved_beatmapset_count)}`
            ]
        },
        user.guest_beatmapset_count == 0 ? null : {
            separator: '', indent: '> ', content: [
                `**${user.guest_beatmapset_count}** guest ${user.guest_beatmapset_count == 1 ? 'difficulty' : 'difficulties'}`
            ]
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
        { separator: '', indent: '', content: ['\u200b'] },
        {
            separator: ' • ', indent: '> ',
            content: [
                `joined <t:${Math.round(moment.utc(user.join_date).valueOf() / 1000)}:R>`,
                user.is_online ? 'currently online' : user.last_visit ? `last seen <t:${Math.round(moment.utc(user.last_visit).valueOf() / 1000)}:R>` : null,
            ]
        },
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
const plural = (num: number) => num == 1 ? '' : 's';
