import { ChatInputCommandInteraction } from 'discord.js';

const mode_choices = [{ name: 'osu', value: 'osu' }, { name: 'taiko', value: 'taiko' }, { name: 'catch', value: 'fruits' }, { name: 'mania', value: 'mania' }];

module.exports = {
    name: 'osu',
    description: 'Various osu! related commands',
    type: 1,
    options: [
        {
            name: 'profile',
            description: 'Show the profile of a player',
            type: 1,
            options: [
                { name: 'user', description: 'osu! account id or username', required: false, type: 3 },
                { name: 'mode', description: 'gamemode', required: false, type: 3, choices: mode_choices },
            ]
        },
        {
            name: 'recent',
            description: 'Show the most recent score of a player',
            type: 1,
            options: [
                { name: 'user', description: 'osu! account id or username', required: false, type: 3 },
                { name: 'mode', description: 'gamemode', required: false, type: 3, choices: mode_choices },
                { name: 'best', description: 'limit to top scores', required: false, type: 5 },
                { name: 'pass', description: 'limit to passes', required: false, type: 5 },
                { name: 'index', description: 'index of the score (1-100, default: 1)', required: false, type: 4 },
            ]
        },
        {
            name: 'scores',
            description: 'List the scores of a player on a map',
            type: 1,
            options: [
                { name: 'map', description: 'beatmap id', required: true, type: 4 },
                { name: 'user', description: 'osu! account id or username', required: false, type: 3 },
                { name: 'mode', description: 'gamemode', required: false, type: 3, choices: mode_choices },
            ]
        }
    ],
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        switch (interaction.options.getSubcommand()) {
            case 'profile': require('./osu/profile.js')(interaction); break;
            case 'recent': require('./osu/recent.js')(interaction); break;
            default: return;
        }
    }
};
