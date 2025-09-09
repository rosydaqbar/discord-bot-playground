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
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');
const musicPlayer = require('../services/musicPlayer');
const fuzzySearch = require('../utils/fuzzySearch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from your local collection')
        .addStringOption(option =>
            option.setName('filename')
                .setDescription('Local music file name (without extension)')
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

        const filename = interaction.options.getString('filename');
        await interaction.deferReply();

        try {
            // Find the music file using existing method first
            let filePath = await musicPlayer.findMusicFile(filename);

            if (!filePath) {
                // Show searching message
                const searchingContainer = new ContainerBuilder()
                    .setAccentColor(0xFFFF00)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Searching...')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`Searching for "${filename}" in your music collection...`)
                    );

                await interaction.editReply({
                    components: [searchingContainer],
                    flags: MessageFlags.IsComponentsV2
                });

                // Perform fuzzy search
                const searchResults = await fuzzySearch.fuzzySearch(filename, 10);

                if (searchResults.length > 0) {
                    // Show search results
                    return await this.showSearchResults(interaction, filename, searchResults);
                } else {
                    // No results found - show error with external search options
                    return await this.showNoResultsError(interaction, filename);
                }
            }

            const guildId = interaction.guildId;
            const isCurrentlyPlaying = musicPlayer.isPlaying(guildId) || musicPlayer.isPaused(guildId);

            if (isCurrentlyPlaying) {
                // Add to queue if music is already playing
                const queuedTrack = await musicPlayer.addToQueue(guildId, filePath);

                // Get file info for display
                const fileStats = await fs.stat(filePath);
                const fileSize = (fileStats.size / (1024 * 1024)).toFixed(2);
                const queueLength = musicPlayer.getQueueLength(guildId);

                const queueContainer = new ContainerBuilder()
                    .setAccentColor(0x00FF00)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Added to Queue')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    );

                // Add artwork if available
                if (queuedTrack.artwork) {
                    // Create attachment for the artwork
                    const attachment = new AttachmentBuilder(queuedTrack.artwork, { name: 'album-artwork.jpg' });
                    
                    // Add track info with artwork in a section
                    queueContainer.addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent(`**${queuedTrack.title}**\n**Artist:** ${queuedTrack.artist}\n**Album:** ${queuedTrack.album}\n\n**Position:** ${queueLength}\n\nUse \`/queue\` to see the full queue or \`/skip\` to skip to this track.`)
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder()
                                    .setURL('attachment://album-artwork.jpg')
                            )
                    );
                    
                    const buttonRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('view_queue')
                                .setLabel('View Queue')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📋'),
                            new ButtonBuilder()
                                .setCustomId('skip_to_track')
                                .setLabel('Skip to Track')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('⏭️')
                        );

                    return interaction.editReply({
                        files: [attachment],
                        components: [queueContainer, buttonRow],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else {
                    // No artwork available, use simple text display
                    queueContainer.addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**${queuedTrack.title}**\n**Artist:** ${queuedTrack.artist}\n**Album:** ${queuedTrack.album}\n\n**Position:** ${queueLength}\n\nUse \`/queue\` to see the full queue or \`/skip\` to skip to this track.`)
                    );

                    const buttonRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('view_queue')
                                .setLabel('View Queue')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📋'),
                            new ButtonBuilder()
                                .setCustomId('skip_to_track')
                                .setLabel('Skip to Track')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('⏭️')
                        );

                    return interaction.editReply({
                        components: [queueContainer, buttonRow],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            } else {
                // Play immediately if nothing is playing
                const track = await musicPlayer.playFile(channel, filePath, interaction.channel);

                // Get file info for display
                const fileStats = await fs.stat(filePath);
                const fileSize = (fileStats.size / (1024 * 1024)).toFixed(2);

                const playingContainer = new ContainerBuilder()
                    .setAccentColor(0x00FF00)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Now Playing')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    );

                // Add artwork if available
                console.log(`🎨 Track artwork in play command:`, track.artwork ? 'Available' : 'Not available');
                if (track.artwork) {
                    console.log(`🎨 Adding artwork to container: ${track.artwork}`);
                    
                    // Create attachment for the artwork
                    const attachment = new AttachmentBuilder(track.artwork, { name: 'album-artwork.jpg' });
                    
                    // Add track info with artwork in a section
                    playingContainer.addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent(`**${track.title}**\n**Artist:** ${track.artist}\n**Album:** ${track.album}\n\nMusic is now playing!`)
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder()
                                    .setURL('attachment://album-artwork.jpg')
                            )
                    );
                    
                    // Get queue info for button states
                    const queue = await musicPlayer.getQueue(guildId);
                    const hasNext = queue.length > 0;
                    const hasPrevious = musicPlayer.hasPreviousTrack(guildId); // We'll need to implement this

                    // Create buttons outside the container
                    const buttonRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('music_previous')
                                .setLabel('Previous')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('⏮️')
                                .setDisabled(!hasPrevious),
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
                                .setCustomId('music_next')
                                .setLabel('Next')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('⏭️')
                                .setDisabled(!hasNext),
                            new ButtonBuilder()
                                .setCustomId('view_queue')
                                .setLabel('Queue')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📋')
                        );
                    
                    return interaction.editReply({
                        components: [playingContainer, buttonRow],
                        files: [attachment],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else {
                    // If no artwork, add track info as regular text display
                    playingContainer.addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**${track.title}**\n**Artist:** ${track.artist}\n**Album:** ${track.album}\n\nMusic is now playing!`)
                    );
                }

                // Get queue info for button states
                const queue = await musicPlayer.getQueue(guildId);
                const hasNext = queue.length > 0;
                const hasPrevious = musicPlayer.hasPreviousTrack(guildId);

                // Create buttons outside the container
                const buttonRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('music_previous')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⏮️')
                            .setDisabled(!hasPrevious),
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
                            .setCustomId('music_next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⏭️')
                            .setDisabled(!hasNext),
                        new ButtonBuilder()
                            .setCustomId('view_queue')
                            .setLabel('Queue')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('📋')
                    );

                // If no artwork, send without attachment
                return interaction.editReply({
                    components: [playingContainer, buttonRow],
                    flags: MessageFlags.IsComponentsV2
                });
            }

        } catch (error) {
            console.error('Play command error:', error);
            
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
                        .setContent(`Something went wrong: ${error.message.substring(0, 1900)}`)
                );

            return interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const musicDir = path.resolve(config.musicDirectory);

            if (!await fs.pathExists(musicDir)) {
                return interaction.respond([]);
            }

            // Get all music files recursively
            const findAllFiles = async (dir, prefix = '') => {
                const files = [];
                const items = await fs.readdir(dir, { withFileTypes: true });

                for (const item of items) {
                    if (item.isDirectory()) {
                        const subFiles = await findAllFiles(
                            path.join(dir, item.name),
                            prefix ? `${prefix}/${item.name}` : item.name
                        );
                        files.push(...subFiles);
                    } else if (config.supportedFormats.some(ext => item.name.endsWith(ext))) {
                        const name = path.parse(item.name).name;
                        files.push(prefix ? `${prefix}/${name}` : name);
                    }
                }
                return files;
            };

            const allFiles = await findAllFiles(musicDir);
            const matches = allFiles
                .filter(file => file.toLowerCase().includes(focusedValue.toLowerCase()))
                .slice(0, 25)
                .map(file => ({ name: file, value: file }));

            return interaction.respond(matches);
        } catch (error) {
            console.error('Autocomplete error:', error);
            return interaction.respond([]);
        }
    },

    // Show search results with selectable options
    async showSearchResults(interaction, originalQuery, searchResults) {
        const searchCompleteContainer = new ContainerBuilder()
            .setAccentColor(0x00FF00)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('## Search Complete')
            )
            .addSeparatorComponents(
                separator => separator
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for "${originalQuery}":`)
            );

        // Create select menu with search results
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('play_search_result')
            .setPlaceholder('Choose a track to play...')
            .setMinValues(1)
            .setMaxValues(1);

        // Add options for each search result
        for (let i = 0; i < Math.min(searchResults.length, 25); i++) { // Discord limit is 25 options
            const result = searchResults[i];
            const similarity = Math.round(result.similarity * 100);
            
            let description = `${similarity}% match`;
            if (result.directory) {
                description += ` • ${result.directory}`;
            }
            
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(result.name.length > 100 ? result.name.substring(0, 97) + '...' : result.name)
                    .setDescription(description.length > 100 ? description.substring(0, 97) + '...' : description)
                    .setValue(`play:${result.relativePath}`)
            );
        }

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        // Add additional buttons
        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`rerun_play:${originalQuery}`)
                    .setLabel('Rerun Command')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('search_qobuz')
                    .setLabel('Search on Qobuz')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎵'),
                new ButtonBuilder()
                    .setCustomId('search_apple_music')
                    .setLabel('Search on Apple Music')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🍎'),
                new ButtonBuilder()
                    .setCustomId('search_youtube')
                    .setLabel('Search on YouTube')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📺')
            );

        return interaction.editReply({
            components: [searchCompleteContainer, selectRow, buttonRow],
            flags: MessageFlags.IsComponentsV2
        });
    },

    // Show error when no results are found
    async showNoResultsError(interaction, originalQuery) {
        const noResultsContainer = new ContainerBuilder()
            .setAccentColor(0xFF0000)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('## No Results Found')
            )
            .addSeparatorComponents(
                separator => separator
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`No matches found for "${originalQuery}" in your local music collection.\n\n**Supported Formats:**\n${config.supportedFormats.join(', ')}\n\nTry searching external sources or check your spelling.`)
            );

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`rerun_play:${originalQuery}`)
                    .setLabel('Rerun Command')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('search_qobuz')
                    .setLabel('Search on Qobuz')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎵'),
                new ButtonBuilder()
                    .setCustomId('search_apple_music')
                    .setLabel('Search on Apple Music')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🍎'),
                new ButtonBuilder()
                    .setCustomId('search_youtube')
                    .setLabel('Search on YouTube')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📺')
            );

        return interaction.editReply({
            components: [noResultsContainer, buttonRow],
            flags: MessageFlags.IsComponentsV2
        });
    },
};