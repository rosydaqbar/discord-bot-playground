const fs = require('fs-extra');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../../logs');
        this.ensureLogDir();
    }

    async ensureLogDir() {
        try {
            await fs.ensureDir(this.logDir);
        } catch (error) {
            console.error('Failed to create logs directory:', error);
        }
    }

    // Get timestamp in readable format
    getTimestamp() {
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    // Get colored timestamp for console
    getColoredTimestamp() {
        return `\x1b[90m[${this.getTimestamp()}]\x1b[0m`;
    }

    // Format user info
    formatUser(user) {
        return user ? `${user.username}#${user.discriminator} (${user.id})` : 'Unknown User';
    }

    // Format guild info
    formatGuild(guild) {
        return guild ? `${guild.name} (${guild.id})` : 'DM';
    }

    // Format channel info
    formatChannel(channel) {
        if (!channel) return 'Unknown Channel';
        return channel.name ? `#${channel.name} (${channel.id})` : `DM (${channel.id})`;
    }

    // Log to console with colors
    logToConsole(level, message, data = {}) {
        const timestamp = this.getColoredTimestamp();
        let colorCode = '';
        let emoji = '';

        switch (level.toLowerCase()) {
            case 'info':
                colorCode = '\x1b[36m'; // Cyan
                emoji = 'ℹ️';
                break;
            case 'success':
                colorCode = '\x1b[32m'; // Green
                emoji = '✅';
                break;
            case 'warning':
                colorCode = '\x1b[33m'; // Yellow
                emoji = '⚠️';
                break;
            case 'error':
                colorCode = '\x1b[31m'; // Red
                emoji = '❌';
                break;
            case 'command':
                colorCode = '\x1b[35m'; // Magenta
                emoji = '🎵';
                break;
            case 'button':
                colorCode = '\x1b[34m'; // Blue
                emoji = '🔘';
                break;
            case 'music':
                colorCode = '\x1b[36m'; // Cyan
                emoji = '🎶';
                break;
            default:
                colorCode = '\x1b[37m'; // White
                emoji = '📝';
        }

        console.log(`${timestamp} ${emoji} ${colorCode}[${level.toUpperCase()}]\x1b[0m ${message}`);
        
        // Log additional data if provided
        if (Object.keys(data).length > 0) {
            console.log(`${timestamp}    \x1b[90m${JSON.stringify(data, null, 2)}\x1b[0m`);
        }
    }

    // Log to file
    async logToFile(level, message, data = {}) {
        try {
            const logEntry = {
                timestamp: this.getTimestamp(),
                level: level.toLowerCase(),
                message,
                data
            };

            const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
            const logLine = JSON.stringify(logEntry) + '\n';
            
            await fs.appendFile(logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    // Main logging method
    async log(level, message, data = {}) {
        this.logToConsole(level, message, data);
        await this.logToFile(level, message, data);
    }

    // Convenience methods
    async info(message, data = {}) {
        await this.log('info', message, data);
    }

    async success(message, data = {}) {
        await this.log('success', message, data);
    }

    async warning(message, data = {}) {
        await this.log('warning', message, data);
    }

    async error(message, data = {}) {
        await this.log('error', message, data);
    }

    async command(message, data = {}) {
        await this.log('command', message, data);
    }

    async button(message, data = {}) {
        await this.log('button', message, data);
    }

    async music(message, data = {}) {
        await this.log('music', message, data);
    }

    // Log slash command interactions
    async logSlashCommand(interaction) {
        const user = this.formatUser(interaction.user);
        const guild = this.formatGuild(interaction.guild);
        const channel = this.formatChannel(interaction.channel);
        
        const options = interaction.options?.data?.map(opt => `${opt.name}:${opt.value}`).join(', ') || 'none';
        
        await this.command(`Slash command executed: /${interaction.commandName}`, {
            user,
            guild,
            channel,
            command: interaction.commandName,
            options,
            timestamp: Date.now()
        });
    }

    // Log button interactions
    async logButtonInteraction(interaction) {
        const user = this.formatUser(interaction.user);
        const guild = this.formatGuild(interaction.guild);
        const channel = this.formatChannel(interaction.channel);
        
        await this.button(`Button clicked: ${interaction.customId}`, {
            user,
            guild,
            channel,
            buttonId: interaction.customId,
            messageId: interaction.message?.id,
            timestamp: Date.now()
        });
    }

    // Log music events
    async logMusicEvent(event, data = {}) {
        await this.music(`Music event: ${event}`, {
            event,
            ...data,
            timestamp: Date.now()
        });
    }

    // Log web API requests
    async logWebRequest(req, action, data = {}) {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        
        await this.info(`Web API: ${action}`, {
            method: req.method,
            url: req.originalUrl,
            ip,
            userAgent,
            action,
            ...data,
            timestamp: Date.now()
        });
    }

    // Log system events
    async logSystem(message, data = {}) {
        await this.info(`System: ${message}`, {
            ...data,
            timestamp: Date.now()
        });
    }

    // Get log statistics
    async getLogStats() {
        try {
            const files = await fs.readdir(this.logDir);
            const logFiles = files.filter(file => file.endsWith('.log'));
            
            let totalLines = 0;
            let totalSize = 0;
            
            for (const file of logFiles) {
                const filePath = path.join(this.logDir, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
                
                const content = await fs.readFile(filePath, 'utf8');
                totalLines += content.split('\n').length - 1;
            }
            
            return {
                files: logFiles.length,
                totalLines,
                totalSize: Math.round(totalSize / 1024), // KB
                oldestLog: logFiles.sort()[0],
                newestLog: logFiles.sort().reverse()[0]
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    // Clean old logs (keep last 30 days)
    async cleanOldLogs(daysToKeep = 30) {
        try {
            const files = await fs.readdir(this.logDir);
            const logFiles = files.filter(file => file.endsWith('.log'));
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            let deletedCount = 0;
            
            for (const file of logFiles) {
                const fileDate = new Date(file.replace('.log', ''));
                if (fileDate < cutoffDate) {
                    await fs.remove(path.join(this.logDir, file));
                    deletedCount++;
                }
            }
            
            if (deletedCount > 0) {
                await this.info(`Cleaned ${deletedCount} old log files`);
            }
            
            return deletedCount;
        } catch (error) {
            await this.error('Failed to clean old logs', { error: error.message });
            return 0;
        }
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;