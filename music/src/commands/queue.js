const {
    SlashCommandBuilder,
    ContainerBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const path = require('path');
const musicPlayer = require('../services/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const currentTrack = musicPlayer.getCurrentTrack(guildId);
        
        const queue = await musicPlayer.getQueue(guildId);

        if (!currentTrack && queue.length === 0) {
            const emptyQueueContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Music Queue')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('No music is currently playing and the queue is empty!\n\nUse `/play` to add some music!')
                );

            return interaction.reply({
                components: [emptyQueueContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const isPaused = musicPlayer.isPaused(guildId);
        const isPlaying = musicPlayer.isPlaying(guildId);
        
        // Create beautiful queue display
        const queueContainer = new ContainerBuilder()
            .setAccentColor(isPlaying ? 0x00FF00 : isPaused ? 0xFFFF00 : 0xFF0000)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('## Music Queue')
            )
            .addSeparatorComponents(
                separator => separator
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Status:** ${isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Idle'}`)
            );

        // Current track section
        if (currentTrack) {
            const status = isPaused ? 'Paused' : isPlaying ? 'Playing' : 'Stopped';
            const startedTime = Math.floor(currentTrack.startTime / 1000);
            
            const currentTrackContainer = new ContainerBuilder()
                .setAccentColor(0x0099FF)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Now Playing')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**${currentTrack.title}**\n**Artist:** ${currentTrack.artist || 'Unknown Artist'}\n**Album:** ${currentTrack.album || 'Unknown Album'}\n\n**Started:** <t:${startedTime}:R>\n**Status:** ${status}`)
                );

            const separator1 = new ContainerBuilder()
                .addSeparatorComponents(
                    separator => separator
                );

            // Queue section
            if (queue.length > 0) {
                const displayQueue = queue.slice(0, 10);
                let queueText = displayQueue.map((track, index) => 
                    `**${index + 1}.** ${track.title} - ${track.artist || 'Unknown Artist'}`
                ).join('\n');

                if (queue.length > 10) {
                    queueText += `\n\n*...and ${queue.length - 10} more track${queue.length - 10 === 1 ? '' : 's'}*`;
                }

                const queueListContainer = new ContainerBuilder()
                    .setAccentColor(0x0099FF)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`## Up Next (${queue.length} track${queue.length === 1 ? '' : 's'})`)
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(queueText)
                    );

                const buttonRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('music_pause')
                            .setLabel(isPaused ? 'Resume' : 'Pause')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(isPaused ? '▶️' : '⏸️')
                            .setDisabled(!currentTrack),
                        new ButtonBuilder()
                            .setCustomId('music_skip')
                            .setLabel('Skip')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('⏭️')
                            .setDisabled(queue.length === 0),
                        new ButtonBuilder()
                            .setCustomId('music_stop')
                            .setLabel('Stop')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('⏹️')
                            .setDisabled(!currentTrack),
                        new ButtonBuilder()
                            .setCustomId('queue_refresh')
                            .setLabel('Refresh')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔄')
                    );

                return interaction.reply({
                    components: [queueContainer, currentTrackContainer, separator1, queueListContainer, buttonRow],
                    flags: MessageFlags.IsComponentsV2
                });
            } else {
                const emptyQueueContainer = new ContainerBuilder()
                    .setAccentColor(0x0099FF)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Queue')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('*Queue is empty. Use `/play` to add more tracks!*')
                    );

                const buttonRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('music_pause')
                            .setLabel(isPaused ? 'Resume' : 'Pause')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(isPaused ? '▶️' : '⏸️')
                            .setDisabled(!currentTrack),
                        new ButtonBuilder()
                            .setCustomId('music_skip')
                            .setLabel('Skip')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('⏭️')
                            .setDisabled(queue.length === 0),
                        new ButtonBuilder()
                            .setCustomId('music_stop')
                            .setLabel('Stop')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('⏹️')
                            .setDisabled(!currentTrack),
                        new ButtonBuilder()
                            .setCustomId('queue_refresh')
                            .setLabel('Refresh')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔄')
                    );

                return interaction.reply({
                    components: [queueContainer, currentTrackContainer, separator1, emptyQueueContainer, buttonRow],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        } else {
            // No current track but queue exists
            const queueListContainer = new ContainerBuilder()
                .setAccentColor(0x0099FF)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`## Queue (${queue.length} track${queue.length === 1 ? '' : 's'})`)
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(queue.map((track, index) => `**${index + 1}.** ${track.title} - ${track.artist || 'Unknown Artist'}`).join('\n'))
                );

            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_pause')
                        .setLabel(isPaused ? 'Resume' : 'Pause')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(isPaused ? '▶️' : '⏸️')
                        .setDisabled(!currentTrack),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setLabel('Skip')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⏭️')
                        .setDisabled(queue.length === 0),
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setLabel('Stop')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⏹️')
                        .setDisabled(!currentTrack),
                    new ButtonBuilder()
                        .setCustomId('queue_refresh')
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄')
                );

            return interaction.reply({
                components: [queueContainer, queueListContainer, buttonRow],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};