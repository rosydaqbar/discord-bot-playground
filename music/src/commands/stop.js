const { 
    SlashCommandBuilder, 
    ContainerBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ActionRowBuilder
} = require('discord.js');
const musicPlayer = require('../services/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),

    async execute(interaction) {
        const currentTrack = musicPlayer.getCurrentTrack(interaction.guildId);

        if (!currentTrack) {
            const noMusicContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## No Music Playing')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('No music is currently playing!')
                );

            return interaction.reply({
                components: [noMusicContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const success = musicPlayer.stop(interaction.guildId);
        
        if (success) {
            const stopContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Music Stopped')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('Music has been stopped and queue cleared.\n\n**Queue Status:**\nQueue is now empty\n\nUse \`/play\` to start playing music again!')
                );

            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('play_music')
                        .setLabel('Play Music')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🎵')
                );

            return interaction.reply({
                components: [stopContainer, buttonRow],
                flags: MessageFlags.IsComponentsV2
            });
        } else {
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
                        .setContent('Failed to stop music!')
                );

            return interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};