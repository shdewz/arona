import { CommandInteraction } from 'discord.js';
import userModel from '../../models/user_schema.js';
import * as osu from '../../helpers/osu.js';
import * as tools from '../../helpers/osu-tools.js';
import * as moment from 'moment';
import * as numeral from 'numeral';

module.exports = async (interaction: CommandInteraction) => {
    let query = interaction.options.getString('user') || (await userModel.findOne({ user_id: interaction.member.user.id }))?.osu_id;
    if (!query) return interaction.editReply('You have not linked your account yet! Do it with the `/set osu:[user]` command.');
    let mode = interaction.options.getString('mode') || 'osu';
    let modetext = mode == 'osu' ? '' : mode == 'fruits' ? 'catch' : mode;

    let user = await osu.getUser(query, mode);
    if (!user || user.error) return interaction.editReply(`User **${user}** not found!`);
    let stats = user.statistics;

    let lines = [
        {
            separator: ' ', indent: '> ',
            content: [
                !stats.global_rank ? null : `**Rank:** \`#${format(stats.global_rank, '0,0')} (#${format(stats.country_rank, '0,0')} ${user.country_code})\``
            ]
        },
        {
            separator: ' \u200b \u200b ', indent: '> ',
            content: [
                !stats.pp ? null : `**PP:** \`${format(Math.round(stats.pp), '0,0')}\``,
                `**Acc:** \`${stats.hit_accuracy.toFixed(2)}%\``
            ]
        },
        {
            separator: ' \u200b \u200b ', indent: '> ',
            content: [
                `**Level:** \`${stats.level.current}.${stats.level.progress}\``,
                user.badges.length > 0 ? `**Badges:** \`${user.badges.length}\`` : null
            ]
        },
        { separator: '', indent: '', content: ['\u200b'] },
        {
            separator: '', indent: '> ',
            content: [`**Playcount:** \`${format(stats.play_count, '0,0')} (${format(Math.round(stats.play_time / 60 / 60), '0,0')} h)\``]
        },
        {
            separator: '', indent: '> ',
            content: [`**Ranked score:** \`${numeral(stats.ranked_score).format('0.0a')}\``]
        },
        user.scores_first_count == 0 ? null : {
            separator: '', indent: '> ', content: [`**First places:** \`${user.scores_first_count}\``]
        },
        user.ranked_beatmapset_count == 0 ? null : {
            separator: '', indent: '> ', content: [`**Ranked mapsets:** \`${user.ranked_beatmapset_count}\``]
        },
    ];

    await interaction.editReply({
        embeds: [{
            color: !user.profile_colour ? null : parseInt(user.profile_colour.substr(1), 16),
            author: {
                name: user.username,
                icon_url: `https://assets.ppy.sh/old-flags/${user.country_code}.png`,
                url: `https://osu.ppy.sh/users/${user.id}/${mode}`,
            },
            title: !user.title ? '' : user.title,
            description: lines.filter(e => e).map(line => line.indent + line.content.filter(e => e).join(line.separator)).join('\n'),
            thumbnail: { url: user.avatar_url },
            footer: {
                icon_url: `https://shdewz.me/assets/icons/${user.is_online ? 'online.png' : 'offline.png'}`,
                text: user.is_online ? 'Currently online' : user.last_visit == null ? '' : `Last online ${moment.utc(user.last_visit).fromNow()}`
            }
        }]
    });
}

const format = (num: number, format: string) => numeral(num).format(format);