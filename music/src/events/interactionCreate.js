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
        
        // Handle string select menu interactions
        if (interaction.isStringSelectMenu()) {
            console.log('🔍 SELECT MENU INTERACTION:', interaction.customId);
            
            if (interaction.customId === 'play_search_result') {
                const selectedValue = interaction.values[0];
                console.log('🔍 Selected value:', selectedValue);
                
                if (selectedValue.startsWith('play:')) {
                    const filename = selectedValue.replace('play:', '');
                    console.log('🔍 Playing selected file:', filename);
                    
                    // Get the play command and execute it with the selected filename
                    const playCommand = interaction.client.commands.get('play');
                    if (playCommand) {
                        // Create a mock options object
                        const mockOptions = {
                            getString: (name) => name === 'filename' ? filename : null
                        };
                        
                        // Create a mock interaction
                        const mockInteraction = {
                            ...interaction,
                            options: mockOptions,
                            deferReply: async () => {
                                await interaction.deferReply();
                            },
                            editReply: async (options) => {
                                await interaction.editReply(options);
                            }
                        };
                        
                        try {
                            await playCommand.execute(mockInteraction);
                        } catch (error) {
                            console.error('Error executing play command from select menu:', error);
                            
                            const { ContainerBuilder, MessageFlags } = require('discord.js');
                            const errorContainer = new ContainerBuilder()
                                .setAccentColor(0xFF0000)
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('## Error')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent(`Failed to play selected track: ${error.message}`)
                                );

                            await interaction.reply({
                                components: [errorContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                        }
                    }
                }
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