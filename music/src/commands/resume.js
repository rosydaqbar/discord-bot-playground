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
        .setName('resume')
        .setDescription('Resume the paused song'),

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

        if (!musicPlayer.isPaused(interaction.guildId)) {
            const notPausedContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Music Not Paused')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('Music is not currently paused!')
                );

            return interaction.reply({
                components: [notPausedContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const success = musicPlayer.resume(interaction.guildId);
        
        if (success) {
            const resumeContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Music Resumed')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**${currentTrack.title}**\n\nMusic is now playing!`)
                );

            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_pause')
                        .setLabel('Pause')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⏸️'),
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setLabel('Stop')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⏹️'),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setLabel('Skip')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⏭️')
                );

            return interaction.reply({
                components: [resumeContainer, buttonRow],
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
                        .setContent('Failed to resume music!')
                );

            return interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};