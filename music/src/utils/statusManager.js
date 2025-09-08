const { ActivityType, PresenceUpdateStatus } = require('discord.js');
const logger = require('./logger');
const clientRegistry = require('./clientRegistry');

class StatusManager {
    constructor(client) {
        this.client = client;
        this.currentActivity = null;
        this.isIdle = true;
        this.activeQueues = new Set();
        this.lastLogTime = 0;
        this.logThrottleMs = 30000; // Only log status changes every 30 seconds
        
        // Status update interval (every 30 seconds to reduce spam)
        this.updateInterval = setInterval(() => {
            this.updateStatus();
        }, 30000);
    }

    // Set bot to idle status
    setIdle() {
        if (this.isIdle) return; // Already idle
        
        this.isIdle = true;
        this.currentActivity = null;
        
        if (this.client && this.client.user) {
            this.client.user.setPresence({
                activities: [], // No activities when idle
                status: PresenceUpdateStatus.Idle
            });
            
            // Throttle logging to prevent spam
            this.throttledLog('Bot status set to Idle (no activity)');
        }
    }

    // Set bot to playing status
    setPlaying(trackTitle, guildName) {
        this.isIdle = false;
        this.currentActivity = { trackTitle, guildName };
        
        if (this.client && this.client.user) {
            const activityName = trackTitle.length > 50 ? 
                trackTitle.substring(0, 47) + '...' : 
                trackTitle;
                
            this.client.user.setPresence({
                activities: [{
                    name: `🎵 ${activityName}`,
                    type: ActivityType.Listening,
                    state: `in ${guildName}`
                }],
                status: PresenceUpdateStatus.Online
            });
            
            this.throttledLog(`Bot status set to Playing: ${trackTitle} in ${guildName}`);
        }
    }

    // Set bot to paused status
    setPaused(trackTitle, guildName) {
        this.isIdle = false;
        this.currentActivity = { trackTitle, guildName, paused: true };
        
        if (this.client && this.client.user) {
            const activityName = trackTitle.length > 50 ? 
                trackTitle.substring(0, 47) + '...' : 
                trackTitle;
                
            this.client.user.setPresence({
                activities: [{
                    name: `⏸️ ${activityName}`,
                    type: ActivityType.Listening,
                    state: `Paused in ${guildName}`
                }],
                status: PresenceUpdateStatus.DoNotDisturb
            });
            
            this.throttledLog(`Bot status set to Paused: ${trackTitle} in ${guildName}`);
        }
    }

    // Set bot to loading/buffering status
    setLoading(guildName) {
        this.isIdle = false;
        
        if (this.client && this.client.user) {
            this.client.user.setPresence({
                activities: [{
                    name: '🔄 Loading music...',
                    type: ActivityType.Custom,
                    state: `in ${guildName}`
                }],
                status: PresenceUpdateStatus.DoNotDisturb
            });
            
            this.throttledLog(`Bot status set to Loading in ${guildName}`);
        }
    }

    // Throttled logging to prevent spam
    throttledLog(message) {
        const now = Date.now();
        if (now - this.lastLogTime > this.logThrottleMs) {
            logger.info(message);
            this.lastLogTime = now;
        }
    }

    // Add a guild to active queues
    addActiveQueue(guildId) {
        this.activeQueues.add(guildId);
    }

    // Remove a guild from active queues
    removeActiveQueue(guildId) {
        this.activeQueues.delete(guildId);
        
        // If no more active queues, set to idle immediately
        if (this.activeQueues.size === 0) {
            this.setIdle();
        }
    }

    // Update status based on current music activity
    updateStatus() {
        if (!this.client || !this.client.user) return;

        try {
            // Get active music from our music player service
            const musicPlayer = require('../services/musicPlayer');
            
            let hasActiveMusic = false;
            let currentTrack = null;
            let currentGuild = null;

            // Check all guilds for active music using our music player service
            for (const guild of this.client.guilds.cache.values()) {
                const track = musicPlayer.getCurrentTrack(guild.id);
                
                if (track) {
                    const isPlaying = musicPlayer.isPlaying(guild.id);
                    const isPaused = musicPlayer.isPaused(guild.id);
                    
                    if (isPlaying || isPaused) {
                        hasActiveMusic = true;
                        currentTrack = track;
                        currentGuild = guild;
                        
                        this.addActiveQueue(guild.id);
                        
                        if (isPaused) {
                            this.setPaused(track.title, guild.name);
                        } else if (isPlaying) {
                            this.setPlaying(track.title, guild.name);
                        }
                        
                        break; // Use the first active track found
                    } else {
                        // Track exists but not playing
                        this.removeActiveQueue(guild.id);
                    }
                } else {
                    // No track at all
                    this.removeActiveQueue(guild.id);
                }
            }

            // If no active music found anywhere, set to idle
            if (!hasActiveMusic) {
                this.setIdle();
            }

        } catch (error) {
            logger.error('Error updating bot status', { error: error.message });
            // On error, default to idle to be safe
            this.setIdle();
        }
    }

    // Get current status info
    getStatusInfo() {
        return {
            isIdle: this.isIdle,
            currentActivity: this.currentActivity,
            activeQueues: this.activeQueues.size,
            activeQueueIds: Array.from(this.activeQueues),
            discordStatus: this.client?.user?.presence?.status,
            discordActivities: this.client?.user?.presence?.activities?.length || 0,
            lastUpdate: Date.now()
        };
    }

    // Manually trigger status update
    forceUpdate() {
        this.updateStatus();
    }

    // Clean up interval on shutdown
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

module.exports = StatusManager;