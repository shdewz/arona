import { ChatInputCommandInteraction } from 'discord.js';
import userModel from '../../models/user_schema.js';
import channelModel from '../../models/channel_schema.js';
import * as common from './_common.js';

module.exports = async (interaction: ChatInputCommandInteraction) => {
    let user_obj = await userModel.findOne({ user_id: interaction.member.user.id });
    let query = interaction.options.getString('user') || user_obj?.osu_id;
    if (!query) return interaction.editReply('You have not linked your account yet! Do it with the `/set osu:[user]` command.');

    let channel = await channelModel.findOne({ id: interaction.channelId });
    if (!channel?.last_beatmap?.id) return interaction.editReply('No recent beatmaps found in channel');

    let mode = channel.last_beatmap.mode;
    let beatmap_id = channel.last_beatmap.id;

    let scores = await common.scoreEmbed(query, beatmap_id, mode, user_obj);
    if (scores.error) return interaction.editReply(scores.error);

    await interaction.editReply({
        embeds: [scores.embed]
    });
}
