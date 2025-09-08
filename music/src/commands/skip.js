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
        .setName('skip')
        .setDescription('Skip the current song'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const currentTrack = musicPlayer.getCurrentTrack(guildId);
        const queueLength = musicPlayer.getQueueLength(guildId);

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

        const currentTitle = currentTrack.title;

        if (queueLength > 0) {
            // Skip to next track in queue
            const success = await musicPlayer.skipTrack(guildId);

            if (success) {
                const nextTrack = musicPlayer.getCurrentTrack(guildId);
                const skipContainer = new ContainerBuilder()
                    .setAccentColor(0x00FF00)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Track Skipped')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`Skipped **${currentTitle}**\n\n**Now Playing:**\n${nextTrack ? `**${nextTrack.title}**` : 'No track available'}\n\n**Queue:** ${queueLength - 1} track${queueLength - 1 === 1 ? '' : 's'} remaining`)
                    );

                const buttonRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('music_pause')
                            .setLabel('Pause')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⏸️'),
                        new ButtonBuilder()
                            .setCustomId('music_skip')
                            .setLabel('Skip')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('⏭️'),
                        new ButtonBuilder()
                            .setCustomId('music_stop')
                            .setLabel('Stop')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('⏹️')
                    );

                return interaction.reply({
                    components: [skipContainer, buttonRow],
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
                            .setContent('Failed to skip to next track!')
                    );

                return interaction.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        } else {
            // No queue, just stop
            const success = musicPlayer.stop(guildId);

            if (success) {
                const stopContainer = new ContainerBuilder()
                    .setAccentColor(0x00FF00)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Track Skipped')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`Skipped **${currentTitle}**\n\n**Queue Status:**\nQueue is empty, music stopped.\n\nUse \`/play\` to add more music!`)
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
                            .setContent('Failed to skip music!')
                    );

                return interaction.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }
    },
};