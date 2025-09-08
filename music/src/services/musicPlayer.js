const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, VoiceConnectionStatus, StreamType } = require('@discordjs/voice');
const { Medley, Queue } = require('@seamless-medley/medley');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');

// Try to import music-metadata for artwork extraction
let parseFile = null;
try {
    const { parseFile: parse } = require('music-metadata');
    parseFile = parse;
    console.log('✅ music-metadata loaded successfully for artwork extraction');
} catch (error) {
    console.log('⚠️ music-metadata not available for artwork extraction');
}

class MusicPlayer {
    constructor() {
        this.connections = new Map(); // guildId -> connection
        this.players = new Map(); // guildId -> discord player
        this.medleys = new Map(); // guildId -> medley instance
        this.queues = new Map(); // guildId -> medley queue
        this.audioStreams = new Map(); // guildId -> audio stream info
        this.currentTracks = new Map(); // guildId -> track info
        this.customQueues = new Map(); // guildId -> our own queue array
        this.previousTracks = new Map(); // guildId -> previous tracks history
        this.channelInfo = new Map(); // guildId -> channel info for reconnection
        this.disconnectTimeouts = new Map(); // guildId -> disconnect timeout
        this.autoDisconnectDelay = 10000; // 10 seconds
        this.discordClient = null; // Discord client reference for sending messages
        this.isSkipping = new Map(); // Track skip operations per guild
    }

    // Set Discord client reference
    setDiscordClient(client) {
        this.discordClient = client;
    }

    // Send "Now Playing" message to text channel
    async sendNowPlayingMessage(guildId) {
        console.log(`🎵 sendNowPlayingMessage called for guild ${guildId}`);
        
        if (!this.discordClient) {
            console.log(`🎵 sendNowPlayingMessage: No Discord client available`);
            return;
        }

        const currentTrack = this.getCurrentTrack(guildId);
        if (!currentTrack) {
            console.log(`🎵 sendNowPlayingMessage: No current track found`);
            return;
        }

        const channelInfo = this.channelInfo.get(guildId);
        if (!channelInfo || !channelInfo.textChannelId) {
            console.log(`🎵 sendNowPlayingMessage: No text channel info for guild ${guildId}`);
            return;
        }

        try {
            const textChannel = await this.discordClient.channels.fetch(channelInfo.textChannelId);
            if (!textChannel) return;

            const isPlaying = this.isPlaying(guildId);
            const isPaused = this.isPaused(guildId);
            
            if (!isPlaying && !isPaused) return;
            
            const startedTime = Math.floor(currentTrack.startTime / 1000);
            const durationText = currentTrack.duration ? `${Math.floor(currentTrack.duration / 60)}:${Math.floor(currentTrack.duration % 60).toString().padStart(2, '0')}` : 'Unknown';
            const status = isPaused ? '**PAUSED**' : '**PLAYING**';

            const { ContainerBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

            const nowPlayingContainer = new ContainerBuilder()
                .setAccentColor(isPaused ? 0xFFFF00 : 0x00FF00)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Now Playing')
                )
                .addSeparatorComponents(
                    separator => separator
                );

            // Get queue info for button states
            const queue = await this.getQueue(guildId);
            const hasNext = queue.length > 0;
            const hasPrevious = this.hasPreviousTrack(guildId);

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
                        .setLabel(isPaused ? 'Resume' : 'Pause')
                        .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji(isPaused ? '▶️' : '⏸️'),
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

            // Add artwork if available
            if (currentTrack.artwork) {
                // Create attachment for the artwork
                const attachment = new AttachmentBuilder(currentTrack.artwork, { name: 'album-artwork.jpg' });
                
                // Add track info with artwork in a section
                nowPlayingContainer.addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`**${currentTrack.title}**\n**Artist:** ${currentTrack.artist || 'Unknown Artist'}\n**Album:** ${currentTrack.album || 'Unknown Album'}\n\n**Duration:** ${durationText}\n**Started:** <t:${startedTime}:R>\n**Status:** ${status}`)
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL('attachment://album-artwork.jpg')
                        )
                );
                
                // Send message with attachment
                await textChannel.send({
                    files: [attachment],
                    components: [nowPlayingContainer, buttonRow],
                    flags: MessageFlags.IsComponentsV2
                });
                return;
            } else {
                // No artwork available, use simple text display
                nowPlayingContainer.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**${currentTrack.title}**\n**Artist:** ${currentTrack.artist || 'Unknown Artist'}\n**Album:** ${currentTrack.album || 'Unknown Album'}\n\n**Duration:** ${durationText}\n**Started:** <t:${startedTime}:R>\n**Status:** ${status}`)
                );
            }

            // Send message without attachment (for no artwork case)
            await textChannel.send({
                components: [nowPlayingContainer, buttonRow],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error sending now playing message:', error);
        }
    }

    // Set text channel for a guild (for auto-disconnect messages)
    setTextChannel(guildId, textChannel) {
        const channelInfo = this.channelInfo.get(guildId);
        if (channelInfo) {
            channelInfo.textChannelId = textChannel.id;
            console.log(`📝 Set text channel for guild ${guildId}: ${textChannel.name}`);
        } else {
            // Create new channel info if it doesn't exist
            this.channelInfo.set(guildId, {
                voiceChannelId: null,
                textChannelId: textChannel.id,
                guildId: guildId,
                adapterCreator: null
            });
            console.log(`📝 Created new channel info for guild ${guildId} with text channel: ${textChannel.name}`);
        }
    }

    // Start auto-disconnect timer for a guild
    startAutoDisconnectTimer(guildId) {
        // Check if already disconnected or no connection exists
        const connection = this.connections.get(guildId);
        if (!connection || connection.state.status === 'destroyed') {
            console.log(`⏰ Skipping auto-disconnect timer for guild ${guildId} - already disconnected`);
            return;
        }

        // Clear any existing timeout
        this.clearAutoDisconnectTimer(guildId);

        const timeout = setTimeout(() => {
            this.autoDisconnect(guildId);
        }, this.autoDisconnectDelay);

        this.disconnectTimeouts.set(guildId, timeout);
        console.log(`⏰ Auto-disconnect timer started for guild ${guildId} (${this.autoDisconnectDelay / 1000}s)`);
    }

    // Clear auto-disconnect timer for a guild
    clearAutoDisconnectTimer(guildId) {
        const timeout = this.disconnectTimeouts.get(guildId);
        if (timeout) {
            clearTimeout(timeout);
            this.disconnectTimeouts.delete(guildId);
            console.log(`⏰ Auto-disconnect timer cleared for guild ${guildId}`);
        }
    }

    // Auto-disconnect from voice channel
    async autoDisconnect(guildId) {
        const connection = this.connections.get(guildId);
        const currentTrack = this.currentTracks.get(guildId);
        const customQueue = this.customQueues.get(guildId);

        // Check if already disconnected
        if (!connection || connection.state.status === 'destroyed') {
            console.log(`🔌 Already disconnected from guild ${guildId}`);
            this.clearAutoDisconnectTimer(guildId);
            return;
        }

        // Double-check conditions before disconnecting
        if (!currentTrack && (!customQueue || customQueue.length === 0)) {
            console.log(`🔌 Auto-disconnecting from guild ${guildId} - no music playing for ${this.autoDisconnectDelay / 1000}s`);
            
            // Clear the timer immediately to prevent loops
            this.clearAutoDisconnectTimer(guildId);
            
            // Send auto-disconnect message if Discord client is available
            if (this.discordClient) {
                try {
                    const guild = this.discordClient.guilds.cache.get(guildId);
                    if (guild) {
                        const channelInfo = this.channelInfo.get(guildId);
                        if (channelInfo && channelInfo.textChannelId) {
                            const textChannel = guild.channels.cache.get(channelInfo.textChannelId);
                            if (textChannel && textChannel.isTextBased()) {
                                const { ContainerBuilder, MessageFlags } = require('discord.js');
                                
                                const disconnectContainer = new ContainerBuilder()
                                    .setAccentColor(0xFFFF00)
                                    .addTextDisplayComponents(
                                        textDisplay => textDisplay
                                            .setContent('## Queue Ended')
                                    )
                                    .addSeparatorComponents(
                                        separator => separator
                                    )
                                    .addTextDisplayComponents(
                                        textDisplay => textDisplay
                                            .setContent('All music has finished playing!\n\nThe bot has left the voice channel.\n\nUse `/play` to start a new music session!')
                                    );

                                await textChannel.send({
                                    components: [disconnectContainer],
                                    flags: MessageFlags.IsComponentsV2
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error sending auto-disconnect message for guild ${guildId}:`, error);
                }
            }
            
            try {
                if (connection && connection.state.status !== 'destroyed') {
                    connection.destroy();
                    console.log(`✅ Successfully auto-disconnected from guild ${guildId}`);
                }
            } catch (error) {
                console.error(`❌ Error during auto-disconnect for guild ${guildId}:`, error);
            }

            // Clean up resources
            this.cleanup(guildId);
        } else {
            console.log(`⏰ Auto-disconnect cancelled for guild ${guildId} - music is playing or queue has tracks`);
            // Clear the timer since conditions changed
            this.clearAutoDisconnectTimer(guildId);
        }
    }

    async initializeForGuild(guildId) {
        if (this.medleys.has(guildId)) {
            return; // Already initialized
        }

        // Create Medley queue and instance
        const queue = new Queue();
        const medley = new Medley(queue, {
            logging: false,
            skipDeviceScanning: true
        });

        // Set to null audio device (no physical output)
        medley.setAudioDevice({ type: 'Null', device: 'Null Device' });
        
        // Enable high quality features
        medley.replayGainBoost = 1.0; // Enable ReplayGain normalization

        // Store instances
        this.queues.set(guildId, queue);
        this.medleys.set(guildId, medley);
        this.customQueues.set(guildId, []); // Initialize our custom queue

        // Set up event listeners
        medley.on('started', async (deckIndex, trackPlay) => {
            console.log(`🎵 Started playing: ${trackPlay.track.path}`);
            
            // Get metadata for the track using Medley
            const medleyMetadata = await this.getMetadata(trackPlay.track.path);
            
            // Extract artwork using Medley's getCoverAndLyrics method
            const artwork = await this.extractArtwork(trackPlay.track.path);
            
            // Add current track to previous tracks history
            const currentTrack = this.currentTracks.get(guildId);
            if (currentTrack) {
                const previousTracks = this.previousTracks.get(guildId) || [];
                previousTracks.push(currentTrack);
                // Keep only last 10 tracks in history
                if (previousTracks.length > 10) {
                    previousTracks.shift();
                }
                this.previousTracks.set(guildId, previousTracks);
            }
            
            const trackInfo = {
                title: medleyMetadata?.title || path.basename(trackPlay.track.path, path.extname(trackPlay.track.path)),
                artist: medleyMetadata?.artist || 'Unknown Artist',
                album: medleyMetadata?.album || 'Unknown Album',
                filePath: trackPlay.track.path,
                duration: trackPlay.duration || medleyMetadata?.duration || 0,
                startTime: Date.now(),
                metadata: medleyMetadata,
                artwork: artwork
            };
            
            this.currentTracks.set(guildId, trackInfo);
            
            // Clear auto-disconnect timer when music starts
            this.clearAutoDisconnectTimer(guildId);
            
            // Send "Now Playing" message to text channel (with small delay to ensure track info is set)
            console.log(`🎵 Started event: Scheduling auto "Now Playing" message for guild ${guildId}`);
            setTimeout(() => {
                console.log(`🎵 Started event: Sending auto "Now Playing" message for guild ${guildId}`);
                this.sendNowPlayingMessage(guildId);
            }, 500);
        });

        medley.on('finished', (deckIndex, trackPlay) => {
            console.log(`🎵 FINISHED EVENT: ${trackPlay.track.path}`);
            
            // Check if we're in the middle of a skip operation
            const isSkipping = this.isSkipping.get(guildId);
            console.log(`🎵 FINISHED EVENT: Skip flag for guild ${guildId}:`, isSkipping);
            
            if (isSkipping) {
                console.log(`🎵 FINISHED EVENT: Skip operation in progress - not deleting currentTracks or starting auto-disconnect`);
                // Clear skip flag after processing the finished event
                this.isSkipping.delete(guildId);
                console.log(`🎵 FINISHED EVENT: Skip flag cleared after processing`);
                return;
            }
            
            // Only delete currentTracks if not skipping
            this.currentTracks.delete(guildId);

            // Check if there are more tracks in our custom queue
            const customQueue = this.customQueues.get(guildId);
            console.log(`🎵 FINISHED EVENT: Custom queue length: ${customQueue ? customQueue.length : 0}`);

            if (customQueue && customQueue.length > 0) {
                console.log(`🎵 FINISHED EVENT: Auto-playing next track (${customQueue.length} remaining)`);
                const nextTrack = customQueue.shift(); // Remove first track

                // Add to Medley queue and play
                const medleyQueue = this.queues.get(guildId);
                if (medleyQueue) {
                    medleyQueue.add(nextTrack);
                    medley.play();
                    console.log(`🎵 FINISHED EVENT: Started playing ${nextTrack}`);
                }
            } else {
                console.log(`🎵 FINISHED EVENT: No more tracks in queue - starting auto-disconnect timer`);
                // Start auto-disconnect timer when no more tracks
                this.startAutoDisconnectTimer(guildId);
            }
        });

        medley.on('enqueueNext', (done) => {
            // Let Medley handle automatic queue progression
            done(true);
        });

        console.log(`🎵 Medley initialized for guild ${guildId}`);
    }

    async playFile(voiceChannel, filePath, textChannel = null) {
        const guildId = voiceChannel.guild.id;

        // Initialize Medley for this guild if needed
        await this.initializeForGuild(guildId);

        const medley = this.medleys.get(guildId);
        const queue = this.queues.get(guildId);

        // Check if file exists and is loadable
        if (!await fs.pathExists(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        if (!Medley.isTrackLoadable(filePath)) {
            throw new Error(`File is not playable: ${filePath}`);
        }

        // Log file format for quality verification
        const fileExt = path.extname(filePath).toLowerCase();
        console.log(`🎵 File format: ${fileExt} - ${path.basename(filePath)}`);
        
        // Special handling for FLAC files (lossless quality)
        if (fileExt === '.flac') {
            console.log(`🎵 FLAC file detected - Lossless audio quality`);
        }

        // Store channel info for reconnection and messaging
        this.channelInfo.set(guildId, {
            voiceChannelId: voiceChannel.id,
            textChannelId: textChannel ? textChannel.id : null,
            guildId: guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });

        // Create or get voice connection
        let connection = this.connections.get(guildId);
        if (!connection || connection.state.status === 'destroyed') {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });
            this.connections.set(guildId, connection);
            console.log(`🎵 Created new voice connection for guild ${guildId}`);
        } else {
            console.log(`🎵 Reusing existing voice connection for guild ${guildId}`);
        }

        // Clear auto-disconnect timer when starting to play
        this.clearAutoDisconnectTimer(guildId);

        // Create Discord audio player
        const discordPlayer = createAudioPlayer();
        this.players.set(guildId, discordPlayer);

        // Request PCM audio stream from Medley with Discord-compatible settings
        const audioSettings = {
            format: 'Int16LE', // Discord.js compatible format
            sampleRate: 48000, // Discord maximum
            bufferSize: 48000 * 4, // 1 second buffer for stability
            buffering: 48000 * 1, // 250ms buffering for low latency
            gain: config.volume || 0.8
        };
        
        console.log(`🎵 Medley Discord-compatible audio settings:`, {
            format: audioSettings.format,
            sampleRate: audioSettings.sampleRate,
            bufferSize: audioSettings.bufferSize,
            buffering: audioSettings.buffering,
            gain: audioSettings.gain
        });
        
        const audioStreamResult = await medley.requestAudioStream(audioSettings);

        this.audioStreams.set(guildId, audioStreamResult);

        // Create audio resource from Medley's PCM stream with highest quality
        const resource = createAudioResource(audioStreamResult.stream, {
            inputType: StreamType.Raw,
            inlineVolume: false, // Volume controlled by Medley
            silencePaddingFrames: 0 // No silence padding for cleaner audio
        });

        // Add track to Medley queue and start playing
        queue.add(filePath);
        medley.play();

        // Play through Discord
        discordPlayer.play(resource);
        connection.subscribe(discordPlayer);

        // Handle Discord player events
        discordPlayer.on(AudioPlayerStatus.Playing, () => {
            console.log('🎵 Discord player started');
            // Clear auto-disconnect timer when music is playing
            this.clearAutoDisconnectTimer(guildId);
        });

        discordPlayer.on(AudioPlayerStatus.Idle, () => {
            console.log('🎵 Discord player idle');
            // Only start auto-disconnect timer if no music is playing and queue is empty
            const currentTrack = this.currentTracks.get(guildId);
            const customQueue = this.customQueues.get(guildId);
            
            if (!currentTrack && (!customQueue || customQueue.length === 0)) {
                this.startAutoDisconnectTimer(guildId);
            }
        });

        discordPlayer.on('error', (error) => {
            // Only log non-premature close errors
            if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
                console.error('🎵 Discord player error:', error);
                // Only try to recover if connection still exists
                const connection = this.connections.get(guildId);
                if (connection && connection.state.status !== 'destroyed') {
                    this.stop(guildId);
                }
            }
            // Ignore premature close errors as they're expected during skip/stop
        });

        // Handle audio resource errors more gracefully
        resource.playStream.on('error', (error) => {
            // Only log non-premature close errors
            if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
                console.error('🎵 Audio stream error:', error);
            }
            // Ignore premature close errors as they're expected during skip/stop
        });

        resource.playStream.on('close', () => {
            console.log('🎵 Audio stream closed');
        });

        // Prevent uncaught errors
        resource.playStream.on('end', () => {
            console.log('🎵 Audio stream ended');
        });

        // Get metadata for the track using Medley
        const medleyMetadata = await this.getMetadata(filePath);
        
        // Extract artwork for the track
        const artwork = await this.extractArtwork(filePath);
        
        // Return track info with metadata and artwork
        const trackInfo = {
            title: medleyMetadata?.title || path.basename(filePath, path.extname(filePath)),
            artist: medleyMetadata?.artist || 'Unknown Artist',
            album: medleyMetadata?.album || 'Unknown Album',
            filePath: filePath,
            startTime: Date.now(),
            metadata: medleyMetadata,
            artwork: artwork
        };

        return trackInfo;
    }

    pause(guildId) {
        const medley = this.medleys.get(guildId);
        if (medley && medley.playing && !medley.paused) {
            medley.togglePause();
            return true;
        }
        return false;
    }

    resume(guildId) {
        const medley = this.medleys.get(guildId);
        if (medley && medley.playing && medley.paused) {
            medley.togglePause();
            // Clear auto-disconnect timer when resuming
            this.clearAutoDisconnectTimer(guildId);
            return true;
        }
        return false;
    }

    // Soft stop - stops playback but keeps voice connection
    softStop(guildId) {
        const medley = this.medleys.get(guildId);
        const discordPlayer = this.players.get(guildId);
        const audioStream = this.audioStreams.get(guildId);

        // Stop Discord player first to prevent stream errors
        if (discordPlayer) {
            try {
                discordPlayer.stop();
            } catch (error) {
                console.log('Discord player already stopped');
            }
            this.players.delete(guildId);
        }

        // Clean up audio stream
        if (audioStream && medley) {
            try {
                medley.deleteAudioStream(audioStream.id);
            } catch (error) {
                console.log('Audio stream already cleaned up');
            }
            this.audioStreams.delete(guildId);
        }

        // Stop Medley playback
        if (medley && medley.playing) {
            try {
                medley.stop();
            } catch (error) {
                console.log('Medley already stopped');
            }
        }

        this.currentTracks.delete(guildId);
        
        // Clear skip flag when stopping
        this.isSkipping.delete(guildId);
        
        // Only start auto-disconnect timer if queue is empty
        const customQueue = this.customQueues.get(guildId);
        if (!customQueue || customQueue.length === 0) {
            this.startAutoDisconnectTimer(guildId);
        }
        
        return true;
    }

    stop(guildId) {
        // Clear auto-disconnect timer before stopping
        this.clearAutoDisconnectTimer(guildId);
        
        // First do a soft stop
        this.softStop(guildId);

        // Then destroy the connection
        const connection = this.connections.get(guildId);
        if (connection) {
            try {
                connection.destroy();
            } catch (error) {
                console.log('Connection already destroyed');
            }
            this.connections.delete(guildId);
        }

        return true;
    }

    getCurrentTrack(guildId) {
        return this.currentTracks.get(guildId);
    }

    isPlaying(guildId) {
        const medley = this.medleys.get(guildId);
        return medley && medley.playing && !medley.paused;
    }

    isPaused(guildId) {
        const medley = this.medleys.get(guildId);
        return medley && medley.playing && medley.paused;
    }

    setVolume(guildId, volume) {
        const medley = this.medleys.get(guildId);
        if (medley) {
            medley.volume = volume;
            return true;
        }
        return false;
    }

    async findMusicFile(filename) {
        const musicDir = path.resolve(config.musicDirectory);

        // Try direct path first
        for (const ext of config.supportedFormats) {
            const testPath = path.join(musicDir, filename + ext);
            if (await fs.pathExists(testPath)) {
                return testPath;
            }
        }

        // Search recursively in subdirectories
        const findFile = async (dir, targetName) => {
            const items = await fs.readdir(dir, { withFileTypes: true });

            for (const item of items) {
                if (item.isDirectory()) {
                    const found = await findFile(path.join(dir, item.name), targetName);
                    if (found) return found;
                } else if (config.supportedFormats.some(ext => item.name.endsWith(ext))) {
                    const nameWithoutExt = path.parse(item.name).name;
                    if (nameWithoutExt === targetName || `${path.basename(dir)}/${nameWithoutExt}` === targetName) {
                        return path.join(dir, item.name);
                    }
                }
            }
            return null;
        };

        return await findFile(musicDir, filename);
    }

    // Get metadata for a file
    async getMetadata(filePath) {
        try {
            const metadata = Medley.getMetadata(filePath);
            
            // Log only essential metadata
            if (metadata) {
                const essential = {
                    title: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    duration: metadata.duration
                };
                console.log(`🎵 Metadata for ${path.basename(filePath)}:`, essential);
            }
            
            return metadata;
        } catch (error) {
            console.error('Error getting metadata:', error);
            return null;
        }
    }

    // Extract artwork from file using Medley's getCoverAndLyrics method
    async extractArtwork(filePath) {
        try {
            const coverData = Medley.getCoverAndLyrics(filePath);
            
            if (coverData && coverData.cover && Buffer.isBuffer(coverData.cover)) {
                console.log(`🎨 Artwork found for ${path.basename(filePath)} (${coverData.cover.length} bytes)`);
                
                // Save artwork as a temporary file
                const artworkDir = path.join(__dirname, '../../temp');
                await fs.ensureDir(artworkDir);
                
                const fileName = `artwork_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                const artworkPath = path.join(artworkDir, fileName);
                
                await fs.writeFile(artworkPath, coverData.cover);
                return artworkPath;
            } else {
                console.log(`🎨 No artwork found for ${path.basename(filePath)}`);
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting artwork:', error);
            return null;
        }
    }

    // Add track to queue without playing immediately
    async addToQueue(guildId, filePath) {
        await this.initializeForGuild(guildId);

        const queue = this.queues.get(guildId);
        if (!queue) {
            throw new Error('Queue not initialized');
        }

        // Check if file exists and is loadable
        if (!await fs.pathExists(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        if (!Medley.isTrackLoadable(filePath)) {
            throw new Error(`File is not playable: ${filePath}`);
        }

        // Add to our custom queue instead of Medley queue directly
        const customQueue = this.customQueues.get(guildId);
        if (!customQueue) {
            throw new Error('Custom queue not initialized');
        }

        customQueue.push(filePath);

        // Clear auto-disconnect timer when adding to queue
        this.clearAutoDisconnectTimer(guildId);

        // Get metadata for the track using Medley
        const medleyMetadata = await this.getMetadata(filePath);
        
        // Extract artwork for the track
        const artwork = await this.extractArtwork(filePath);

        return {
            title: medleyMetadata?.title || path.basename(filePath, path.extname(filePath)),
            artist: medleyMetadata?.artist || 'Unknown Artist',
            album: medleyMetadata?.album || 'Unknown Album',
            filePath: filePath,
            position: customQueue.length,
            metadata: medleyMetadata,
            artwork: artwork
        };
    }

    // Get queue for a guild
    async getQueue(guildId) {
        const customQueue = this.customQueues.get(guildId);
        if (!customQueue) {
            return [];
        }

        const queueWithMetadata = [];
        for (let i = 0; i < customQueue.length; i++) {
            const filePath = customQueue[i];
            const medleyMetadata = await this.getMetadata(filePath);
            const artwork = await this.extractArtwork(filePath);
            queueWithMetadata.push({
                title: medleyMetadata?.title || path.basename(filePath, path.extname(filePath)),
                artist: medleyMetadata?.artist || 'Unknown Artist',
                album: medleyMetadata?.album || 'Unknown Album',
                filePath: filePath,
                position: i + 1,
                metadata: medleyMetadata,
                artwork: artwork
            });
        }

        return queueWithMetadata;
    }

    // Get queue length
    getQueueLength(guildId) {
        const customQueue = this.customQueues.get(guildId);
        return customQueue ? customQueue.length : 0;
    }

    // Check if there's a previous track available
    hasPreviousTrack(guildId) {
        const previousTracks = this.previousTracks.get(guildId);
        return previousTracks && previousTracks.length > 0;
    }

    // Play previous track
    async playPrevious(guildId) {
        const previousTracks = this.previousTracks.get(guildId);
        if (!previousTracks || previousTracks.length === 0) {
            return false;
        }

        const previousTrack = previousTracks.pop();
        this.previousTracks.set(guildId, previousTracks);

        // Play the previous track
        const medley = this.medleys.get(guildId);
        const queue = this.queues.get(guildId);
        
        if (medley && queue) {
            // Add to front of queue and play
            queue.add(previousTrack.filePath);
            medley.play();
            return true;
        }

        return false;
    }

    // Play next track (skip current)
    async playNext(guildId) {
        const customQueue = this.customQueues.get(guildId);
        if (!customQueue || customQueue.length === 0) {
            return false;
        }

        // Skip current track
        return await this.skipTrack(guildId);
    }

    // Skip to next track
    // Skip to next track - manual approach since auto-play isn't working
    async skipTrack(guildId) {
        const customQueue = this.customQueues.get(guildId);
        const medley = this.medleys.get(guildId);
        const queue = this.queues.get(guildId);

        console.log(`🎵 Skip requested - queue has ${customQueue ? customQueue.length : 0} tracks`);

        // Set skip flag to prevent auto-disconnect during skip (set it early!)
        this.isSkipping.set(guildId, true);
        console.log(`🎵 Skip flag set for guild ${guildId}:`, this.isSkipping.get(guildId));

        if (!customQueue || customQueue.length === 0) {
            // Just stop the current track without triggering auto-disconnect
            this.softStop(guildId);
            return false;
        }

        if (!medley || !queue) {
            return false;
        }

        // Get next track
        const nextTrack = customQueue.shift();
        console.log(`🎵 Skipping to: ${path.basename(nextTrack)}`);

        // Use fadeOut for smooth transition since Medley doesn't have built-in skip
        if (medley.playing) {
            console.log(`🎵 Fading out current track`);
            // Use fadeOut for smoother transition
            if (typeof medley.fadeOut === 'function') {
                medley.fadeOut(500); // 500ms fade out
            } else {
                medley.stop();
            }
        }

        // Add next track and play
        queue.add(nextTrack);

        // Start playing the next track
        setTimeout(() => {
            medley.play();
            console.log(`🎵 Started playing next track`);
        }, 200);

        return true;
    }

    // Clear the queue
    clearQueue(guildId) {
        const customQueue = this.customQueues.get(guildId);
        if (customQueue) {
            customQueue.length = 0; // Clear the array
            // Only start auto-disconnect timer if no music is currently playing
            const currentTrack = this.currentTracks.get(guildId);
            if (!currentTrack) {
                this.startAutoDisconnectTimer(guildId);
            }
            return true;
        }
        return false;
    }

    // Debug method to inspect queue structure
    debugQueue(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) {
            console.log('No queue found for guild:', guildId);
            return;
        }

        console.log('Queue debug for guild:', guildId);
        console.log('Queue object keys:', Object.keys(queue));
        console.log('Queue prototype:', Object.getPrototypeOf(queue));
        console.log('Queue length property:', queue.length);
        console.log('Queue size property:', queue.size);
        console.log('Queue tracks property:', queue.tracks);
        console.log('Queue _tracks property:', queue._tracks);

        // Try to iterate
        if (typeof queue[Symbol.iterator] === 'function') {
            console.log('Queue is iterable');
            const items = Array.from(queue);
            console.log('Queue items:', items);
        }
    }

    // Get all active guilds with music
    getActiveGuilds() {
        return Array.from(this.currentTracks.keys()).map(guildId => ({
            guildId,
            isPlaying: this.isPlaying(guildId),
            isPaused: this.isPaused(guildId),
            currentTrack: this.getCurrentTrack(guildId),
            queueLength: this.getQueueLength(guildId)
        }));
    }

    // Clean up resources for a guild
    cleanup(guildId) {
        // Clear auto-disconnect timer
        this.clearAutoDisconnectTimer(guildId);
        
        this.stop(guildId);

        const medley = this.medleys.get(guildId);
        if (medley) {
            // Clean up any remaining audio streams
            const audioStream = this.audioStreams.get(guildId);
            if (audioStream) {
                medley.deleteAudioStream(audioStream.id);
            }
        }

        this.medleys.delete(guildId);
        this.queues.delete(guildId);
        this.audioStreams.delete(guildId);
        this.currentTracks.delete(guildId);
        this.customQueues.delete(guildId);
        this.channelInfo.delete(guildId);
    }

    // Shutdown method to clear all timers and clean up resources
    shutdown() {
        console.log('🔄 Shutting down music player...');
        
        // Clear all auto-disconnect timers
        for (const [guildId, timeout] of this.disconnectTimeouts) {
            clearTimeout(timeout);
            console.log(`⏰ Cleared auto-disconnect timer for guild ${guildId}`);
        }
        this.disconnectTimeouts.clear();
        
        // Clean up all guilds
        const guildIds = Array.from(this.connections.keys());
        for (const guildId of guildIds) {
            this.cleanup(guildId);
        }
        
        console.log('✅ Music player shutdown complete');
    }
}

// Export singleton instance
module.exports = new MusicPlayer();