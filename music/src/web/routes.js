const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');
const logger = require('../utils/logger');
const metadataParser = require('../utils/metadataParser');
const clientRegistry = require('../utils/clientRegistry');
const musicPlayer = require('../services/musicPlayer');

const router = express.Router();

// Throttle warning messages and frequent logs to avoid spam
let lastClientWarning = 0;
let lastStatusLog = 0;
let lastQueueLog = 0;

// Bot status endpoint
router.get('/status', async (req, res) => {
    // Don't log routine status checks from web UI - too frequent
    
    try {
        const clientInfo = clientRegistry.getClientInfo();
        const client = clientRegistry.getClient();
        
        const status = {
            botReady: clientInfo.ready,
            guilds: clientInfo.guilds,
            users: clientInfo.users,
            uptime: clientInfo.uptime,
            timestamp: Date.now(),
            debug: {
                hasClient: !!client,
                clientReady: clientInfo.ready,
                clientUser: clientInfo.tag || 'No user'
            }
        };
        
        // Don't log routine status checks - they're too frequent from web UI
        res.json(status);
    } catch (error) {
        await logger.error('Error getting bot status', { error: error.message });
        res.json({
            botReady: false,
            guilds: 0,
            users: 0,
            uptime: 0,
            timestamp: Date.now(),
            error: error.message
        });
    }
});

// Get music collection
router.get('/collection', async (req, res) => {
    await logger.logWebRequest(req, 'Get Music Collection');
    
    try {
        const musicDir = path.resolve(config.musicDirectory);
        
        if (!await fs.pathExists(musicDir)) {
            await fs.ensureDir(musicDir);
            return res.json([]);
        }

        // Use the metadata parser to get all music files with metadata
        const musicFiles = await metadataParser.parseDirectoryMetadata(musicDir, config.supportedFormats);

        // Only log collection retrieval occasionally
        if (musicFiles.length > 0 && Math.random() < 0.2) {
            await logger.success('Music collection retrieved', { 
                totalFiles: musicFiles.length,
                totalSize: musicFiles.reduce((sum, file) => sum + file.size, 0)
            });
        }
        
        res.json(musicFiles);
    } catch (error) {
        await logger.error('Error getting collection', { error: error.message });
        res.status(500).json({ error: 'Failed to get music collection' });
    }
});

// Get current queue status
router.get('/queue', async (req, res) => {
    // Don't log routine queue checks from web UI
    
    try {
        const client = clientRegistry.getClient();
        
        // Check if Discord client is ready
        if (!clientRegistry.isClientReady()) {
            // Don't log warning every time - only log once per minute to avoid spam
            const now = Date.now();
            if (!lastClientWarning || now - lastClientWarning > 60000) {
                await logger.warning('Discord client not ready for queue status request');
                lastClientWarning = now;
            }
            return res.json({ clientReady: false, guilds: [] });
        }

        const guilds = client.guilds.cache.map(guild => {
            const currentTrack = musicPlayer.getCurrentTrack(guild.id);
            return {
                guildId: guild.id,
                guildName: guild.name,
                isPlaying: musicPlayer.isPlaying(guild.id),
                isPaused: musicPlayer.isPaused(guild.id),
                currentTrack: currentTrack ? {
                    title: currentTrack.title,
                    author: 'Local File',
                    duration: currentTrack.duration,
                    thumbnail: null
                } : null,
                queueSize: currentTrack ? 1 : 0,
                volume: 80 // Default volume, could be made dynamic
            };
        });

        // Don't log queue status checks - only log when there are active queues
        const activeQueues = guilds.filter(g => g.isPlaying).length;
        if (activeQueues > 0) {
            await logger.success('Queue status retrieved', { 
                totalGuilds: guilds.length,
                activeQueues: activeQueues
            });
        }
        
        res.json({
            clientReady: true,
            guilds: guilds,
            timestamp: Date.now()
        });
    } catch (error) {
        await logger.error('Error getting queue status', { error: error.message });
        res.status(500).json({ error: 'Failed to get queue status' });
    }
});

// Play a local file
router.post('/play', async (req, res) => {
    await logger.logWebRequest(req, 'Play Local File', { 
        filename: req.body.filename,
        guildId: req.body.guildId 
    });
    
    try {
        const { filename, guildId } = req.body;
        
        if (!filename || !guildId) {
            return res.status(400).json({ error: 'Filename and guildId are required' });
        }

        const client = clientRegistry.getClient();
        
        // Check if Discord client is ready
        if (!clientRegistry.isClientReady()) {
            return res.status(503).json({ error: 'Discord client not ready' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        // Find a voice channel with members
        const voiceChannel = guild.channels.cache.find(channel => 
            channel.type === 2 && channel.members.size > 0
        );

        if (!voiceChannel) {
            return res.status(400).json({ error: 'No voice channel with members found' });
        }

        // Find the music file
        const filePath = await musicPlayer.findMusicFile(filename);
        if (!filePath) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Play the file using our music player (no text channel for web UI)
        const track = await musicPlayer.playFile(voiceChannel, filePath, null);

        await logger.success('File played successfully via web UI', {
            filename: req.body.filename,
            track: {
                title: track.title,
                filePath: track.filePath
            },
            guild: guild.name
        });
        
        res.json({ 
            success: true, 
            track: {
                title: track.title,
                filePath: track.filePath
            }
        });
    } catch (error) {
        await logger.error('Error playing file via web UI', { 
            error: error.message,
            filename: req.body.filename,
            guildId: req.body.guildId
        });
        res.status(500).json({ error: 'Failed to play file: ' + error.message });
    }
});

// Control playback
router.post('/control/:action', async (req, res) => {
    await logger.logWebRequest(req, `Playback Control: ${req.params.action}`, {
        action: req.params.action,
        guildId: req.body.guildId
    });
    
    try {
        const { action } = req.params;
        const { guildId } = req.body;
        
        if (!guildId) {
            return res.status(400).json({ error: 'Guild ID is required' });
        }

        const client = clientRegistry.getClient();
        
        // Check if Discord client is ready
        if (!clientRegistry.isClientReady()) {
            return res.status(503).json({ error: 'Discord client not ready' });
        }

        const currentTrack = musicPlayer.getCurrentTrack(guildId);
        if (!currentTrack) {
            return res.status(404).json({ error: 'No active music found' });
        }

        let success = false;
        switch (action) {
            case 'pause':
                success = musicPlayer.pause(guildId);
                break;
            case 'resume':
                success = musicPlayer.resume(guildId);
                break;
            case 'stop':
                success = musicPlayer.stop(guildId);
                break;
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        if (success) {
            await logger.success(`Playback control executed: ${action}`, {
                action,
                guildId: req.body.guildId
            });
            
            res.json({ success: true, action });
        } else {
            res.status(500).json({ error: `Failed to ${action} music` });
        }
    } catch (error) {
        await logger.error('Error controlling playback via web UI', {
            error: error.message,
            action: req.params.action,
            guildId: req.body.guildId
        });
        res.status(500).json({ error: 'Failed to control playback' });
    }
});

// Set volume
router.post('/volume', (req, res) => {
    try {
        const { guildId, volume } = req.body;
        
        if (!guildId || volume === undefined) {
            return res.status(400).json({ error: 'Guild ID and volume are required' });
        }

        if (volume < 0 || volume > 100) {
            return res.status(400).json({ error: 'Volume must be between 0 and 100' });
        }

        const client = clientRegistry.getClient();
        
        // Check if Discord client is ready
        if (!clientRegistry.isClientReady()) {
            return res.status(503).json({ error: 'Discord client not ready' });
        }

        const success = musicPlayer.setVolume(guildId, volume / 100);
        
        if (success) {
            res.json({ success: true, volume });
        } else {
            res.status(404).json({ error: 'No active music found' });
        }
    } catch (error) {
        console.error('Error setting volume:', error);
        res.status(500).json({ error: 'Failed to set volume' });
    }
});

module.exports = router;