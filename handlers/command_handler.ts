export { };
require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');

module.exports = (client) => {
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    const commands = [];

    for (const file of commandFiles) {
        const command = require(`../commands/${file}`);
        client.commands.set(command.name, command);
        commands.push(command);
    }

    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
    (async () => {
        try {
            if (process.env.ENV === 'production') {
                await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

                if (process.env.CLEAR_COMMANDS === 'TRUE') {
                    await rest.get(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD))
                        .then(data => {
                            const promises = [];
                            for (const command of data) {
                                const deleteUrl = `${Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD)}/${command.id}`;
                                promises.push(rest.delete(deleteUrl));
                            }
                            return Promise.all(promises);
                        });
                }
            }
            else await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD), { body: commands });

            console.log('Successfully reloaded application commands.');
        } catch (error) { console.error(error); }
    })();
}
