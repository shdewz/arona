import { ChatInputCommandInteraction } from 'discord.js';

const mode_choices = { name: 'mode', description: 'gamemode', required: false, type: 3, choices: [{ name: 'osu', value: 'osu' }, { name: 'taiko', value: 'taiko' }, { name: 'catch', value: 'fruits' }, { name: 'mania', value: 'mania' }] };

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
                mode_choices,
            ]
        },
        {
            name: 'recent',
            description: 'Show the most recent score of a player',
            type: 1,
            options: [
                { name: 'user', description: 'osu! account id or username', required: false, type: 3 },
                mode_choices,
                { name: 'best', description: 'limit to top scores', required: false, type: 5 },
                { name: 'pass', description: 'limit to passes', required: false, type: 5 },
                { name: 'index', description: 'index of the score (1-100, default: 1)', required: false, type: 4 },
            ]
        },
        {
            name: 'top',
            description: 'Show the top scores of a player',
            type: 1,
            options: [
                { name: 'user', description: 'osu! account id or username', required: false, type: 3 },
                mode_choices,
                { name: 'page', description: 'select the initial page', required: false, type: 4 },
                { name: 'sort', description: 'change the sorting method', required: false, type: 3, choices: [
                    { name: 'pp', value: 'pp' },
                    { name: 'date', value: 'date' },
                    { name: 'accuracy', value: 'accuracy' },
                    { name: 'map date', value: 'map date' }
                ] },
                { name: 'reverse', description: 'reverse the list', required: false, type: 5 },
                { name: 'search', description: 'search for plays containing the search query', required: false, type: 3 },
                { name: 'mods', description: 'filter by mods (+mods to include, -mods to exclude, +mods! for exact)', required: false, type: 3 },
            ]
        },
        {
            name: 'scores',
            description: 'List the scores of a player on a map',
            type: 1,
            options: [
                { name: 'map', description: 'beatmap id', required: true, type: 4 },
                { name: 'user', description: 'osu! account id or username', required: false, type: 3 },
                mode_choices,
            ]
        },
        {
            name: 'compare',
            description: 'List the scores of a player on the latest map in the channel',
            type: 1,
            options: [
                { name: 'user', description: 'osu! account id or username', required: false, type: 3 },
            ]
        }
    ],
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        switch (interaction.options.getSubcommand()) {
            case 'profile': require('./osu/profile.js')(interaction); break;
            case 'recent': require('./osu/recent.js')(interaction); break;
            case 'top': require('./osu/top.js')(interaction); break;
            case 'scores': require('./osu/scores.js')(interaction); break;
            case 'compare': require('./osu/compare.js')(interaction); break;
            default: return;
        }
    }
};
