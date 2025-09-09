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

// Temporary cache for search results (in production, consider using Redis or similar)
const searchCache = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from your local collection')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Search for music in your collection')
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

        const query = interaction.options.getString('query');
        await interaction.deferReply();

        try {
            // Find the music file using existing method first
            let filePath = await musicPlayer.findMusicFile(query);

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
                            .setContent(`Searching for "${query}" in your music collection...`)
                    );

                await interaction.editReply({
                    components: [searchingContainer],
                    flags: MessageFlags.IsComponentsV2
                });

                // Perform fuzzy search
                const searchResults = await fuzzySearch.fuzzySearch(query, 100);

                if (searchResults.length > 0) {
                    // Cache search results for pagination
                    const cacheKey = `${interaction.user.id}:${query}`;
                    searchCache.set(cacheKey, {
                        results: searchResults,
                        timestamp: Date.now()
                    });
                    
                    // Clean up old cache entries (older than 10 minutes)
                    for (const [key, value] of searchCache.entries()) {
                        if (Date.now() - value.timestamp > 10 * 60 * 1000) {
                            searchCache.delete(key);
                        }
                    }
                    
                    // Show search results
                    return await this.showSearchResults(interaction, query, searchResults, 0);
                } else {
                    // No results found - show error with external search options
                    return await this.showNoResultsError(interaction, query);
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

    // Show search results with selectable options and pagination
    async showSearchResults(interaction, originalQuery, searchResults, page = 0) {
        const resultsPerPage = 25;
        const totalPages = Math.ceil(searchResults.length / resultsPerPage);
        const startIndex = page * resultsPerPage;
        const endIndex = Math.min(startIndex + resultsPerPage, searchResults.length);
        const currentPageResults = searchResults.slice(startIndex, endIndex);

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
                    .setContent(`Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for "${originalQuery}"\n\n**Page ${page + 1} of ${totalPages}** (showing ${startIndex + 1}-${endIndex} of ${searchResults.length})`)
            );

        // Create select menu with current page results
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('play_search_result')
            .setPlaceholder('Choose a track to play...')
            .setMinValues(1)
            .setMaxValues(1);

        // Add options for current page results
        for (let i = 0; i < currentPageResults.length; i++) {
            const result = currentPageResults[i];
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

        // Create combined action row with pagination and quick actions (closer to dropdown)
        const actionRow = new ActionRowBuilder();
        
        // Previous page button
        if (page > 0) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`search_prev:${originalQuery}:${page - 1}`)
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⬅️')
            );
        }

        // Next page button
        if (page < totalPages - 1) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`search_next:${originalQuery}:${page + 1}`)
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➡️')
            );
        }

        // Add rerun command button (always visible)
        actionRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`rerun_play:${originalQuery}`)
                .setLabel('Search Again')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄')
        );

        // Add clear search button if we have multiple pages
        if (totalPages > 1) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('clear_search')
                    .setLabel('Clear')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗑️')
            );
        }

        // External search buttons (separate row, more compact labels)
        const externalSearchRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('search_qobuz')
                    .setLabel('Qobuz')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎵'),
                new ButtonBuilder()
                    .setCustomId('search_apple_music')
                    .setLabel('Apple Music')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🍎'),
                new ButtonBuilder()
                    .setCustomId('search_youtube')
                    .setLabel('YouTube')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📺'),
                new ButtonBuilder()
                    .setCustomId('search_help')
                    .setLabel('Help')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        // Build components array - action row is always included (right after dropdown)
        const components = [searchCompleteContainer, selectRow, actionRow, externalSearchRow];

        return interaction.editReply({
            components: components,
            flags: MessageFlags.IsComponentsV2
        });
    },

    // Show search results with pagination (for button updates)
    async showSearchResultsUpdate(interaction, originalQuery, searchResults, page = 0) {
        const resultsPerPage = 25;
        const totalPages = Math.ceil(searchResults.length / resultsPerPage);
        const startIndex = page * resultsPerPage;
        const endIndex = Math.min(startIndex + resultsPerPage, searchResults.length);
        const currentPageResults = searchResults.slice(startIndex, endIndex);

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
                    .setContent(`Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for "${originalQuery}"\n\n**Page ${page + 1} of ${totalPages}** (showing ${startIndex + 1}-${endIndex} of ${searchResults.length})`)
            );

        // Create select menu with current page results
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('play_search_result')
            .setPlaceholder('Choose a track to play...')
            .setMinValues(1)
            .setMaxValues(1);

        // Add options for current page results
        for (let i = 0; i < currentPageResults.length; i++) {
            const result = currentPageResults[i];
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

        // Create combined action row with pagination and quick actions (closer to dropdown)
        const actionRow = new ActionRowBuilder();
        
        // Previous page button
        if (page > 0) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`search_prev:${originalQuery}:${page - 1}`)
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⬅️')
            );
        }

        // Next page button
        if (page < totalPages - 1) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`search_next:${originalQuery}:${page + 1}`)
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➡️')
            );
        }

        // Add rerun command button (always visible)
        actionRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`rerun_play:${originalQuery}`)
                .setLabel('Search Again')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄')
        );

        // Add clear search button if we have multiple pages
        if (totalPages > 1) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('clear_search')
                    .setLabel('Clear')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗑️')
            );
        }

        // External search buttons (separate row, more compact labels)
        const externalSearchRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('search_qobuz')
                    .setLabel('Qobuz')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎵'),
                new ButtonBuilder()
                    .setCustomId('search_apple_music')
                    .setLabel('Apple Music')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🍎'),
                new ButtonBuilder()
                    .setCustomId('search_youtube')
                    .setLabel('YouTube')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📺'),
                new ButtonBuilder()
                    .setCustomId('search_help')
                    .setLabel('Help')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        // Build components array - action row is always included (right after dropdown)
        const components = [searchCompleteContainer, selectRow, actionRow, externalSearchRow];

        return interaction.update({
            components: components,
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

    // Handle pagination for search results
    async handleSearchPagination(interaction, originalQuery, page) {
        const cacheKey = `${interaction.user.id}:${originalQuery}`;
        const cachedData = searchCache.get(cacheKey);
        
        if (!cachedData) {
            // Cache expired or not found, show error
            const expiredContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Search Expired')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('Search results have expired. Please run the search again.')
                );

            const retryButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rerun_play:${originalQuery}`)
                        .setLabel('Search Again')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔍')
                );

            return interaction.update({
                components: [expiredContainer, retryButton],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Show the requested page using update since this is a button interaction
        return await this.showSearchResultsUpdate(interaction, originalQuery, cachedData.results, page);
    },
};