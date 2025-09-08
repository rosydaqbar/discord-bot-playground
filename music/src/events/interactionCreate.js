const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        console.log('🔍 INTERACTION RECEIVED:', interaction.type, interaction.isAutocomplete() ? 'AUTOCOMPLETE' : 'OTHER');
        
        // Handle autocomplete interactions
        if (interaction.isAutocomplete()) {
            console.log('🔍 AUTOCOMPLETE INTERACTION for command:', interaction.commandName);
            
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error('❌ No command found for autocomplete:', interaction.commandName);
                return;
            }
            
            if (!command.autocomplete) {
                console.error('❌ Command has no autocomplete function:', interaction.commandName);
                return;
            }
            
            try {
                console.log('🔍 Calling autocomplete function...');
                await command.autocomplete(interaction);
                console.log('🔍 Autocomplete function completed');
            } catch (error) {
                console.error('❌ Error in autocomplete:', error);
            }
            return;
        }
        
        if (!interaction.isChatInputCommand()) return;

        // Log the slash command interaction
        await logger.logSlashCommand(interaction);

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            await logger.error(`No command matching ${interaction.commandName} was found`, {
                commandName: interaction.commandName,
                user: logger.formatUser(interaction.user),
                guild: logger.formatGuild(interaction.guild)
            });
            return;
        }

        try {
            const startTime = Date.now();
            await command.execute(interaction);
            const executionTime = Date.now() - startTime;
            
            await logger.success(`Command /${interaction.commandName} executed successfully`, {
                executionTime: `${executionTime}ms`,
                user: logger.formatUser(interaction.user),
                guild: logger.formatGuild(interaction.guild)
            });
        } catch (error) {
            await logger.error(`Error executing /${interaction.commandName}`, {
                error: error.message,
                stack: error.stack,
                user: logger.formatUser(interaction.user),
                guild: logger.formatGuild(interaction.guild)
            });
            
            const errorMessage = 'There was an error while executing this command!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage });
            }
        }
    },
};