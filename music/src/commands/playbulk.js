const { 
    SlashCommandBuilder, 
    ContainerBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');
const musicPlayer = require('../services/musicPlayer');
const directoryScanner = require('../utils/directoryScanner');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playbulk')
        .setDescription('Queue all music files from a directory')
        .addStringOption(option =>
            option.setName('directory')
                .setDescription('Directory to load music from')
                .setRequired(true)
                .setAutocomplete(true)),

    async execute(interaction) {
        const channel = interaction.member.voice.channel;

        if (!channel) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Voice Channel Required')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('You need to be in a voice channel to play music!')
                );

            return interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const directoryName = interaction.options.getString('directory');
        await interaction.deferReply();

        try {
            // Security: Sanitize directory name to prevent path traversal
            const sanitizedDirectoryName = directoryName.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
            if (sanitizedDirectoryName !== directoryName) {
                const securityContainer = new ContainerBuilder()
                    .setAccentColor(0xFF0000)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Invalid Directory Name')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('Directory name contains invalid characters.\n\nPlease use autocomplete to select a valid directory.')
                    );

                return interaction.editReply({
                    components: [securityContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Validate the selected directory
            const musicDir = path.resolve(config.musicDirectory);
            const directoryPath = path.resolve(path.join(musicDir, sanitizedDirectoryName));
            
            // Additional security check: ensure resolved path is still within music directory
            const relativePath = path.relative(musicDir, directoryPath);
            if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
                const securityContainer = new ContainerBuilder()
                    .setAccentColor(0xFF0000)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Security Error')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('Directory is outside the allowed music collection.\n\nPlease select a directory within the configured music folder.')
                    );

                return interaction.editReply({
                    components: [securityContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            
            const validation = await directoryScanner.validateDirectory(directoryPath);
            if (!validation.valid) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xFF0000)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Directory Not Found')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`The directory "${directoryName}" could not be found or accessed.\n\n**Error:** ${validation.error}\n\nUse autocomplete to see available directories.`)
                    );

                return interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Show scanning message
            const scanningContainer = new ContainerBuilder()
                .setAccentColor(0xFFFF00)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Scanning Directory...')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`Scanning "${directoryName}" for music files...`)
                );

            await interaction.editReply({
                components: [scanningContainer],
                flags: MessageFlags.IsComponentsV2
            });

            // Scan directory for music files
            const musicFiles = await directoryScanner.getMusicFilesFromDirectory(directoryPath);

            if (musicFiles.length === 0) {
                const noFilesContainer = new ContainerBuilder()
                    .setAccentColor(0xFF0000)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## No Music Files Found')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`No music files found in "${directoryName}".\n\n**Supported Formats:**\n${config.supportedFormats.join(', ')}\n\nTry selecting a different directory.`)
                    );

                return interaction.editReply({
                    components: [noFilesContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Store channel info for music player
            musicPlayer.setTextChannel(interaction.guildId, interaction.channel);

            // Prepare file paths for queue integration
            const filePaths = musicFiles.map(file => file.fullPath);

            const guildId = interaction.guildId;
            const isCurrentlyPlaying = musicPlayer.isPlaying(guildId) || musicPlayer.isPaused(guildId);

            if (isCurrentlyPlaying) {
                // Add all files to existing queue
                const result = await musicPlayer.addMultipleToQueue(guildId, filePaths);

                // Create file listing for display
                const displayTracks = result.tracks.slice(0, 10); // Show first 10 tracks
                let trackList = displayTracks.map((track, index) => 
                    `**${index + 1}.** ${track.title} - ${track.artist}`
                ).join('\n');

                if (result.tracks.length > 10) {
                    trackList += `\n\n*...and ${result.tracks.length - 10} more track${result.tracks.length - 10 === 1 ? '' : 's'}*`;
                }

                const queueContainer = new ContainerBuilder()
                    .setAccentColor(0x00FF00)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Added to Queue')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`📁 **${directoryName}**\n\n**Files Added:** ${result.filesAdded} tracks\n**New Queue Length:** ${result.newQueueLength} tracks`)
                    );

                // Add track listing if we have tracks
                if (result.tracks.length > 0) {
                    const trackListContainer = new ContainerBuilder()
                        .setAccentColor(0x0099FF)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## Tracks Added')
                        )
                        .addSeparatorComponents(
                            separator => separator
                        )
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(trackList)
                        )
                        .addSeparatorComponents(
                            separator => separator
                        )
                        .addButtonComponents(
                            new ButtonBuilder()
                                .setCustomId('view_queue')
                                .setLabel('View Full Queue')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📋'),
                            new ButtonBuilder()
                                .setCustomId('music_pause')
                                .setLabel('Pause')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('⏸️'),
                            new ButtonBuilder()
                                .setCustomId('music_skip')
                                .setLabel('Skip')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('⏭️')
                        );

                    return interaction.editReply({
                        components: [queueContainer, trackListContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else {
                    return interaction.editReply({
                        components: [queueContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            } else {
                // Start playing the first file and queue the rest
                if (filePaths.length > 0) {
                    // Play the first file
                    const firstTrack = await musicPlayer.playFile(channel, filePaths[0], interaction.channel);
                    
                    // Add remaining files to queue if there are any
                    let result = { filesAdded: 0, tracks: [], newQueueLength: 0 };
                    if (filePaths.length > 1) {
                        const remainingPaths = filePaths.slice(1);
                        result = await musicPlayer.addMultipleToQueue(guildId, remainingPaths);
                    }

                    // Create file listing for display (including the currently playing track)
                    const allTracks = [
                        { title: firstTrack.title, artist: firstTrack.artist },
                        ...result.tracks
                    ];
                    
                    const displayTracks = allTracks.slice(0, 10); // Show first 10 tracks
                    let trackList = displayTracks.map((track, index) => {
                        if (index === 0) {
                            return `**${index + 1}.** ${track.title} - ${track.artist} *(Now Playing)*`;
                        }
                        return `**${index + 1}.** ${track.title} - ${track.artist}`;
                    }).join('\n');

                    if (allTracks.length > 10) {
                        trackList += `\n\n*...and ${allTracks.length - 10} more track${allTracks.length - 10 === 1 ? '' : 's'}*`;
                    }

                    const playingContainer = new ContainerBuilder()
                        .setAccentColor(0x00FF00)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## Now Playing from Directory')
                        )
                        .addSeparatorComponents(
                            separator => separator
                        )
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`📁 **${directoryName}**\n\n**Now Playing:** ${firstTrack.title}\n**Files Queued:** ${result.filesAdded} additional tracks\n**Total Tracks:** ${allTracks.length}`)
                        );

                    const trackListContainer = new ContainerBuilder()
                        .setAccentColor(0x0099FF)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## Playlist')
                        )
                        .addSeparatorComponents(
                            separator => separator
                        )
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(trackList)
                        )
                        .addSeparatorComponents(
                            separator => separator
                        )
                        .addButtonComponents(
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
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('⏭️'),
                            new ButtonBuilder()
                                .setCustomId('view_queue')
                                .setLabel('Queue')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📋')
                        );

                    return interaction.editReply({
                        components: [playingContainer, trackListContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            }

        } catch (error) {
            console.error('Playbulk command error:', error);
            
            let errorTitle = '## Error';
            let errorMessage = 'Something went wrong while processing the directory.';
            
            // Handle specific error types
            if (error.message.includes('File not found') || error.message.includes('Directory not found')) {
                errorTitle = '## Directory Not Found';
                errorMessage = `The directory "${directoryName}" could not be found.\n\nUse autocomplete to see available directories.`;
            } else if (error.message.includes('not accessible') || error.message.includes('Permission denied')) {
                errorTitle = '## Access Denied';
                errorMessage = `Unable to access the directory "${directoryName}".\n\nPlease check file permissions or try a different directory.`;
            } else if (error.message.includes('Queue not initialized') || error.message.includes('not playable')) {
                errorTitle = '## Playback Error';
                errorMessage = `Unable to start playback from "${directoryName}".\n\nTry restarting the bot or selecting a different directory.`;
            } else if (error.message.includes('outside of music collection')) {
                errorTitle = '## Invalid Directory';
                errorMessage = `The selected directory is outside the music collection.\n\nPlease select a directory within the configured music folder.`;
            } else {
                // Generic error with sanitized message
                const sanitizedMessage = error.message.replace(/\/[^\/\s]+/g, '[path]'); // Remove file paths
                errorMessage = `An unexpected error occurred: ${sanitizedMessage.substring(0, 1500)}`;
            }
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(errorTitle)
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(errorMessage)
                );

            const helpButtonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('playbulk_help')
                        .setLabel('Help')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❓'),
                    new ButtonBuilder()
                        .setCustomId('refresh_directories')
                        .setLabel('Refresh Directories')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄')
                );

            return interaction.editReply({
                components: [errorContainer, helpButtonRow],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            
            // Get directories from the directory scanner
            const directories = await directoryScanner.getDirectories(focusedValue);
            
            // Format directories for autocomplete with file counts
            const matches = directories
                .map(dir => ({
                    name: `${dir.relativePath} (${dir.fileCount} files)`.length > 100 
                        ? `${dir.relativePath.substring(0, 85)}... (${dir.fileCount} files)`
                        : `${dir.relativePath} (${dir.fileCount} files)`,
                    value: dir.relativePath
                }))
                .slice(0, 25); // Discord limit

            return interaction.respond(matches);
        } catch (error) {
            console.error('Playbulk autocomplete error:', error);
            return interaction.respond([]);
        }
    }
};