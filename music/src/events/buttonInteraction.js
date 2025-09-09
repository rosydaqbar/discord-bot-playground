const { Events, ContainerBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ActionRowBuilder } = require('discord.js');
const musicPlayer = require('../services/musicPlayer');
const logger = require('../utils/logger');
const path = require('path');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        // Log the button interaction
        await logger.logButtonInteraction(interaction);

        try {
            const startTime = Date.now();
                    switch (interaction.customId) {
            case 'music_previous':
                const previousSuccess = await musicPlayer.playPrevious(interaction.guildId);
                if (previousSuccess) {
                    const previousContainer = new ContainerBuilder()
                        .setAccentColor(0x00FF00)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## Previous Track')
                        )
                        .addSeparatorComponents(
                            separator => separator
                        )
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('Playing previous track!')
                        );

                    await interaction.reply({
                        components: [previousContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else {
                    const noPreviousContainer = new ContainerBuilder()
                        .setAccentColor(0xFF0000)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## No Previous Track')
                        )
                        .addSeparatorComponents(
                            separator => separator
                        )
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('No previous track available!')
                        );

                    await interaction.reply({
                        components: [noPreviousContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
                break;

            case 'music_next':
                const nextSuccess = await musicPlayer.playNext(interaction.guildId);
                if (nextSuccess) {
                    const nextContainer = new ContainerBuilder()
                        .setAccentColor(0x00FF00)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## Next Track')
                        )
                        .addSeparatorComponents(
                            separator => separator
                        )
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('Playing next track!')
                        );

                    await interaction.reply({
                        components: [nextContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else {
                    const noNextContainer = new ContainerBuilder()
                        .setAccentColor(0xFF0000)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## No Next Track')
                        )
                        .addSeparatorComponents(
                            separator => separator
                        )
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('No next track available!')
                        );

                    await interaction.reply({
                        components: [noNextContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
                break;

            case 'music_pause':
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

                    if (musicPlayer.isPaused(interaction.guildId)) {
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

                            await interaction.reply({
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

                            await interaction.reply({
                                components: [errorContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                        }
                    } else {
                        const success = musicPlayer.pause(interaction.guildId);
                        if (success) {
                            const pauseContainer = new ContainerBuilder()
                                .setAccentColor(0xFFFF00)
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('## Music Paused')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent(`**${currentTrack.title}**\n\nUse \`/resume\` to continue playing`)
                                );

                            const buttonRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('music_resume')
                                        .setLabel('Resume')
                                        .setStyle(ButtonStyle.Success)
                                        .setEmoji('▶️'),
                                    new ButtonBuilder()
                                        .setCustomId('music_stop')
                                        .setLabel('Stop')
                                        .setStyle(ButtonStyle.Danger)
                                        .setEmoji('⏹️')
                                );

                            await interaction.reply({
                                components: [pauseContainer, buttonRow],
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
                                        .setContent('Failed to pause music!')
                                );

                            await interaction.reply({
                                components: [errorContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                        }
                    }
                    break;

                case 'music_skip':
                    const trackToSkip = musicPlayer.getCurrentTrack(interaction.guildId);
                    const queueLength = musicPlayer.getQueueLength(interaction.guildId);
                    
                    if (!trackToSkip) {
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

                    if (queueLength > 0) {
                        const skipSuccess = await musicPlayer.skipTrack(interaction.guildId);
                        if (skipSuccess) {
                            const nextTrack = musicPlayer.getCurrentTrack(interaction.guildId);
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
                                        .setContent(`Skipped **${trackToSkip.title}**\n\n**Now Playing:**\n${nextTrack ? `**${nextTrack.title}**` : 'No track available'}\n\n**Queue:** ${queueLength - 1} track${queueLength - 1 === 1 ? '' : 's'} remaining`)
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

                            await interaction.reply({
                                components: [skipContainer],
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

                            await interaction.reply({
                                components: [errorContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                        }
                    } else {
                        const stopSuccess = musicPlayer.stop(interaction.guildId);
                        if (stopSuccess) {
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
                                        .setContent(`Skipped **${trackToSkip.title}**\n\n**Queue Status:**\nQueue is empty, music stopped.\n\nUse \`/play\` to add more music!`)
                                );

                            const buttonRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('play_music')
                                        .setLabel('Play Music')
                                        .setStyle(ButtonStyle.Success)
                                        .setEmoji('🎵')
                                );

                            await interaction.reply({
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

                            await interaction.reply({
                                components: [errorContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                        }
                    }
                    break;

                case 'music_stop':
                    const trackToStop = musicPlayer.getCurrentTrack(interaction.guildId);
                    if (!trackToStop) {
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
                                    .setContent(`Stopped **${trackToStop.title}**!\n\n**Queue Status:**\nQueue is now empty\n\nUse \`/play\` to start playing music again!`)
                            );

                        const buttonRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('play_music')
                                    .setLabel('Play Music')
                                    .setStyle(ButtonStyle.Success)
                                    .setEmoji('🎵')
                            );

                        await interaction.reply({
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

                        await interaction.reply({
                            components: [errorContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }
                    break;

                case 'view_queue':
                    // Execute the queue command logic
                    const guildId = interaction.guildId;
                    const currentQueueTrack = musicPlayer.getCurrentTrack(guildId);
                    const queue = await musicPlayer.getQueue(guildId);

                    if (!currentQueueTrack && queue.length === 0) {
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
                                .setContent(`**Status:** ${isPlaying ? '🟢 Playing' : isPaused ? '🟡 Paused' : '🔴 Idle'}`)
                        );

                    // Current track section
                    if (currentQueueTrack) {
                        const status = isPaused ? 'Paused' : isPlaying ? 'Playing' : 'Stopped';
                        const startedTime = Math.floor(currentQueueTrack.startTime / 1000);
                        
                        const currentTrackContainer = new ContainerBuilder()
                            .setAccentColor(0x0099FF)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Now Playing')
                            )
                            .addSeparatorComponents(
                                separator => separator
                            );

                        // Create separator for layout
                        const separator1 = new ContainerBuilder()
                            .addSeparatorComponents(
                                separator => separator
                            );

                        // Add track info (no artwork attachment for now)
                        currentTrackContainer.addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`**${currentQueueTrack.title}**\n**Artist:** ${currentQueueTrack.artist || 'Unknown Artist'}\n**Album:** ${currentQueueTrack.album || 'Unknown Album'}\n**File:** \`${path.basename(currentQueueTrack.filePath)}\`\n**Volume:** 80%\n**Started:** <t:${startedTime}:R>\n**Status:** ${status}`)
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
                                        .setDisabled(!currentQueueTrack),
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
                                        .setDisabled(!currentQueueTrack),
                                    new ButtonBuilder()
                                        .setCustomId('queue_refresh')
                                        .setLabel('Refresh')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setEmoji('🔄')
                                );

                            // Return the reply
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
                                        .setContent('*Queue is empty. Use \`/play\` to add more tracks!*')
                                );

                            const buttonRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('music_pause')
                                        .setLabel(isPaused ? 'Resume' : 'Pause')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setEmoji(isPaused ? '▶️' : '⏸️')
                                        .setDisabled(!currentQueueTrack),
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
                                        .setDisabled(!currentQueueTrack),
                                    new ButtonBuilder()
                                        .setCustomId('queue_refresh')
                                        .setLabel('Refresh')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setEmoji('🔄')
                                );

                            // Return the reply
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
                                    .setContent(queue.map((track, index) => `**${index + 1}.** ${track.title}`).join('\n'))
                            );

                        const buttonRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('music_pause')
                                    .setLabel(isPaused ? 'Resume' : 'Pause')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji(isPaused ? '▶️' : '⏸️')
                                    .setDisabled(!currentQueueTrack),
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
                                    .setDisabled(!currentQueueTrack),
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
                    break;

                case 'skip_to_track':
                    // Execute the skip command logic
                    const skipGuildId = interaction.guildId;
                    const skipCurrentTrack = musicPlayer.getCurrentTrack(skipGuildId);
                    const skipQueueLength = musicPlayer.getQueueLength(skipGuildId);

                    if (!skipCurrentTrack) {
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

                    const skipCurrentTitle = skipCurrentTrack.title;

                    if (skipQueueLength > 0) {
                        // Skip to next track in queue
                        const skipSuccess = await musicPlayer.skipTrack(skipGuildId);

                        if (skipSuccess) {
                            const nextTrack = musicPlayer.getCurrentTrack(skipGuildId);
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
                                        .setContent(`Skipped **${skipCurrentTitle}**\n\n**Now Playing:**\n${nextTrack ? `**${nextTrack.title}**` : 'No track available'}\n\n**Queue:** ${skipQueueLength - 1} track${skipQueueLength - 1 === 1 ? '' : 's'} remaining`)
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
                        const stopSuccess = musicPlayer.stop(skipGuildId);

                        if (stopSuccess) {
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
                                        .setContent(`Skipped **${skipCurrentTitle}**\n\n**Queue Status:**\nQueue is empty, music stopped.\n\nUse \`/play\` to add more music!`)
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
                    break;

                case 'music_resume':
                    const resumeTrack = musicPlayer.getCurrentTrack(interaction.guildId);
                    if (!resumeTrack) {
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

                    const resumeSuccess = musicPlayer.resume(interaction.guildId);
                    
                    if (resumeSuccess) {
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
                                    .setContent(`**${resumeTrack.title}**\n\nMusic is now playing!`)
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
                    break;

                case 'play_music':
                    const playContainer = new ContainerBuilder()
                        .setAccentColor(0x0099FF)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## Play Music')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('Use the `/play` command to start playing music from your local collection!\n\n**Example:**\n`/play songname`\n\n**Features:**\n• Autocomplete for file names\n• High-quality audio streaming\n• Local file playback')
                        );

                    return interaction.reply({
                        components: [playContainer],
                        flags: MessageFlags.IsComponentsV2
                    });

                case 'queue_refresh':
                    const refreshContainer = new ContainerBuilder()
                        .setAccentColor(0x0099FF)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## Queue Refreshed')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('Queue information has been updated!\n\nUse `/queue` to see the latest information.')
                        );

                    return interaction.reply({
                        components: [refreshContainer],
                        flags: MessageFlags.IsComponentsV2
                    });

                case 'volume_mute':
                case 'volume_low':
                case 'volume_high':
                    const volumeContainer = new ContainerBuilder()
                        .setAccentColor(0x0099FF)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## Volume Controls')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('Use the `/volume` command to control the music volume!\n\n**Example:**\n`/volume 50` - Set volume to 50%\n\n**Range:** 0-100%')
                        );

                    return interaction.reply({
                        components: [volumeContainer],
                        flags: MessageFlags.IsComponentsV2
                    });

                case 'track_info':
                    const infoTrack = musicPlayer.getCurrentTrack(interaction.guildId);
                    if (!infoTrack) {
                        const noTrackContainer = new ContainerBuilder()
                            .setAccentColor(0xFF0000)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## No Track Playing')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('No track is currently playing!')
                            );

                        return interaction.reply({
                            components: [noTrackContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }

                    const infoContainer = new ContainerBuilder()
                        .setAccentColor(0x0099FF)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`# ℹ️ Track Information\n\n**Title:** ${infoTrack.title}\n**File:** ${path.basename(infoTrack.filePath)}\n**Source:** Local Collection\n**Started:** <t:${Math.floor(infoTrack.startTime / 1000)}:R>\n**Requested by:** <@${interaction.user.id}>`)
                        );

                    return interaction.reply({
                        components: [infoContainer],
                        flags: MessageFlags.IsComponentsV2
                    });

                case 'dashboard_refresh':
                    const dashboardContainer = new ContainerBuilder()
                        .setAccentColor(0x0099FF)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## Dashboard Refreshed')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('Dashboard information has been updated!\n\nUse `/dashboard` to see the latest information.')
                        );

                    return interaction.reply({
                        components: [dashboardContainer],
                        flags: MessageFlags.IsComponentsV2
                    });

                case 'status_refresh':
                    if (interaction.client.statusManager) {
                        interaction.client.statusManager.forceUpdate();
                        const statusContainer = new ContainerBuilder()
                            .setAccentColor(0x00FF00)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Bot Status Refreshed')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('Bot status has been updated!\n\nUse `/status` to see the latest information.')
                            );

                        return interaction.reply({
                            components: [statusContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    } else {
                        const errorContainer = new ContainerBuilder()
                            .setAccentColor(0xFF0000)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Status Manager Unavailable')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('Status manager is not available.')
                            );

                        return interaction.reply({
                            components: [errorContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }

                case 'status_force_idle':
                    if (interaction.client.statusManager) {
                        interaction.client.statusManager.setIdle();
                        const idleContainer = new ContainerBuilder()
                            .setAccentColor(0xFFFF00)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Bot Status Forced to Idle')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('Bot status has been set to Idle.')
                            );

                        return interaction.reply({
                            components: [idleContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    } else {
                        const errorContainer = new ContainerBuilder()
                            .setAccentColor(0xFF0000)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Status Manager Unavailable')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('Status manager is not available.')
                            );

                        return interaction.reply({
                            components: [errorContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }

                default:
                    // Handle rerun play command
                    if (interaction.customId.startsWith('rerun_play:')) {
                        const query = interaction.customId.replace('rerun_play:', '');
                        
                        // Show a message that the command is being rerun
                        const rerunContainer = new ContainerBuilder()
                            .setAccentColor(0x0099FF)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Command Rerun')
                            )
                            .addSeparatorComponents(
                                separator => separator
                            )
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent(`Rerunning \`/play ${query}\`...\n\nPlease use the \`/play\` command again with your search term.`)
                            );

                        return interaction.reply({
                            components: [rerunContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }

                    // Handle external search buttons
                    if (interaction.customId === 'search_qobuz') {
                        const qobuzContainer = new ContainerBuilder()
                            .setAccentColor(0x0099FF)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Qobuz Search')
                            )
                            .addSeparatorComponents(
                                separator => separator
                            )
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('🚧 **Coming Soon!**\n\nQobuz integration is currently in development.\n\nThis feature will allow you to search and stream high-quality music directly from Qobuz.')
                            );

                        return interaction.reply({
                            components: [qobuzContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }

                    if (interaction.customId === 'search_apple_music') {
                        const appleMusicContainer = new ContainerBuilder()
                            .setAccentColor(0x0099FF)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Apple Music Search')
                            )
                            .addSeparatorComponents(
                                separator => separator
                            )
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('🚧 **Coming Soon!**\n\nApple Music integration is currently in development.\n\nThis feature will allow you to search and stream music directly from Apple Music.')
                            );

                        return interaction.reply({
                            components: [appleMusicContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }

                    if (interaction.customId === 'search_youtube') {
                        const youtubeContainer = new ContainerBuilder()
                            .setAccentColor(0xFF0000)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## YouTube Search')
                            )
                            .addSeparatorComponents(
                                separator => separator
                            )
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('🚧 **Coming Soon!**\n\nYouTube integration is currently in development.\n\nThis feature will allow you to search and stream music directly from YouTube.')
                            );

                        return interaction.reply({
                            components: [youtubeContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }

                    if (interaction.customId === 'clear_search') {
                        const clearContainer = new ContainerBuilder()
                            .setAccentColor(0x00FF00)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Search Cleared')
                            )
                            .addSeparatorComponents(
                                separator => separator
                            )
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('Search results have been cleared.\n\nUse `/play` to start a new search!')
                            );

                        return interaction.update({
                            components: [clearContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }

                    if (interaction.customId === 'search_help') {
                        const helpContainer = new ContainerBuilder()
                            .setAccentColor(0x0099FF)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Search Help')
                            )
                            .addSeparatorComponents(
                                separator => separator
                            )
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('**Search Tips:**\n\n• Use partial song names (e.g., "bohemian" for "Bohemian Rhapsody")\n• Try artist names or album names\n• Spelling doesn\'t need to be perfect - fuzzy search will find close matches\n• Use **Previous/Next** buttons to browse through all results\n• Select any result from the dropdown to play it\n\n**Navigation:**\n• **Previous/Next** - Browse search result pages\n• **Search Again** - Rerun the search command\n• **Clear** - Clear current search results')
                            );

                        return interaction.reply({
                            components: [helpContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }

                    // Handle search pagination
                    if (interaction.customId.startsWith('search_next:') || interaction.customId.startsWith('search_prev:')) {
                        const parts = interaction.customId.split(':');
                        const action = parts[0]; // 'search_next' or 'search_prev'
                        const originalQuery = parts[1];
                        const page = parseInt(parts[2]);
                        
                        const playCommand = require('../commands/play');
                        return await playCommand.handleSearchPagination(interaction, originalQuery, page);
                    }

                    // Handle pagination and other custom interactions
                    if (interaction.customId.startsWith('queue_')) {
                        const comingSoonContainer = new ContainerBuilder()
                            .setAccentColor(0x0099FF)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('## Feature Coming Soon')
                                )
                                .addSeparatorComponents(
                                    separator => separator
                                )
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('This feature is under development!\n\nUse `/queue` for now.')
                            );

                        return interaction.reply({
                            components: [comingSoonContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }
                    break;
            }
            
            const executionTime = Date.now() - startTime;
            await logger.success(`Button interaction ${interaction.customId} processed successfully`, {
                executionTime: `${executionTime}ms`,
                user: logger.formatUser(interaction.user),
                guild: logger.formatGuild(interaction.guild)
            });
            
        } catch (error) {
            await logger.error(`Button interaction error: ${interaction.customId}`, {
                error: error.message,
                stack: error.stack,
                user: logger.formatUser(interaction.user),
                guild: logger.formatGuild(interaction.guild)
            });
            
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
                                        .setContent('There was an error processing your request!')
                );
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            } else {
                await interaction.reply({ 
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }
    },
};