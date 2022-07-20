import { CommandInteraction, InteractionType } from "discord.js";

module.exports = {
    name: 'interactionCreate',
    execute: async interaction => {
        if (interaction.type !== InteractionType.ApplicationCommand) return;
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
            console.log(`Command /${interaction.commandName} issued by ${interaction.user.username}`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
}