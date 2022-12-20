import userModel from '../models/user_schema.js';
import * as osu from '../helpers/osu.js';
const image_choices = [{ name: 'full-width', value: 'full-width' }, { name: 'compact', value: 'compact' }];

const properties = {
    osu: async (discord_id: string, value: string) => {
        let user = await osu.getUser(value, 'osu');
        if (user.error) return { name: 'osu! account', error: user.error };

        await update_user({ user_id: discord_id }, { osu_id: user.id });
        return { name: 'osu! account', value: user.username, icon: user.avatar_url }
    },
    location: async (discord_id: string, value: string) => {
        // ADD: get location name and coordinates from API
        return { name: 'Location', value: value }
    },
    scorestyle: async (discord_id: string, value: string) => {
        await update_user({ user_id: discord_id }, { $set: { 'prefs.score_style': value } });
        return { name: 'Score style', value: image_choices.find(i => i.value == value).name }
    }
}

module.exports = {
    name: 'set',
    description: 'Make changes to your account settings',
    type: 1,
    options: [
        {
            name: 'osu', description: 'Change your linked osu! account', type: 1,
            options: [{ name: 'user', description: 'osu! account ID or username', required: true, type: 3 }]
        },
        {
            name: 'location', description: 'Change your location to be used in certain commands', type: 1,
            options: [{ name: 'query', description: 'location string (city/country/etc.)', required: true, type: 3 }]
        },
        {
            name: 'preferences', description: 'Change the behavior of various commands', type: 1,
            options: [
                {
                    name: 'scorestyle', description: 'Score image style', required: true, type: 3, choices: image_choices
                }
            ]
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let prop = interaction.options.getSubcommand(), title: string, text: string;
        if (prop == 'preferences') prop = interaction.options._hoistedOptions[0].name;
        let update = await properties[prop](interaction.member.id, interaction.options._hoistedOptions[0].value);

        if (!update.error) {
            title = 'Account settings successfully updated:';
            text = `**${update.name}** changed to **${update.value}**`;
        }
        else {
            title = 'Error updating account settings:';
            text = update.error;
        }

        await interaction.editReply({ embeds: [{ author: { name: title, icon_url: update.icon || '' }, description: text }] }, { ephemeral: true });
    },
};

const update_user = async (query, update) => await userModel.findOneAndUpdate(query, update, { upsert: true, new: true });
