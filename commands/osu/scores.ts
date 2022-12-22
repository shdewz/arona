import { ChatInputCommandInteraction } from 'discord.js';
import userModel from '../../models/user_schema.js';
import channelModel from '../../models/channel_schema.js';
import * as common from './_common.js';

module.exports = async (interaction: ChatInputCommandInteraction) => {
    let user_obj = await userModel.findOne({ user_id: interaction.member.user.id });
    let query = interaction.options.getString('user') || user_obj?.osu_id;
    if (!query) return interaction.editReply('You have not linked your account yet! Do it with the `/set osu:[user]` command.');
    let mode = interaction.options.getString('mode') || null;
    let beatmap_id = interaction.options.getInteger('map').toString();

    let scores = await common.scoreEmbed(query, beatmap_id, mode, user_obj);
    if (scores.error) return interaction.editReply(scores.error);

    await interaction.editReply({
        embeds: [scores.embed]
    });

    await channelModel.findOneAndUpdate({ id: interaction.channelId }, { last_beatmap: { id: beatmap_id, mode: mode } }, { upsert: true, new: true });
}
