const { REST, Routes } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class CommandDeployer {
    constructor(config) {
        this.config = config;
        this.rest = new REST().setToken(config.token);
        this.cacheFile = path.join(__dirname, '../../.command-cache.json');
    }

    // Generate hash of current commands for comparison
    generateCommandHash(commands) {
        const commandData = JSON.stringify(commands.sort((a, b) => a.name.localeCompare(b.name)));
        return crypto.createHash('md5').update(commandData).digest('hex');
    }

    // Load cached command hash
    async loadCache() {
        try {
            if (await fs.pathExists(this.cacheFile)) {
                return await fs.readJson(this.cacheFile);
            }
        } catch (error) {
            console.log('📝 No command cache found, will deploy all commands.');
        }
        return { hash: null, timestamp: null };
    }

    // Save command hash to cache
    async saveCache(hash) {
        try {
            await fs.writeJson(this.cacheFile, {
                hash,
                timestamp: Date.now()
            });
        } catch (error) {
            console.warn('⚠️  Could not save command cache:', error.message);
        }
    }

    // Check if commands need to be deployed
    async needsDeployment(commands) {
        const currentHash = this.generateCommandHash(commands);
        const cache = await this.loadCache();
        
        return {
            needed: cache.hash !== currentHash,
            currentHash,
            cachedHash: cache.hash
        };
    }

    // Deploy commands with smart caching
    async deployCommands(commands) {
        try {
            const { needed, currentHash } = await this.needsDeployment(commands);
            
            if (!needed) {
                console.log('✅ Commands are up to date, skipping deployment.');
                return true;
            }

            console.log('🚀 Commands changed, deploying updates...');
            
            // Try global deployment first
            try {
                const data = await this.rest.put(
                    Routes.applicationCommands(this.config.clientId),
                    { body: commands }
                );

                console.log(`✅ Successfully deployed ${data.length} commands globally.`);
                await this.saveCache(currentHash);
                return true;

            } catch (globalError) {
                console.warn('⚠️  Global deployment failed, trying guild deployment...');
                
                // Fallback to guild deployment
                if (this.config.guildId && this.config.guildId !== 'YOUR_GUILD_ID_HERE') {
                    const data = await this.rest.put(
                        Routes.applicationGuildCommands(this.config.clientId, this.config.guildId),
                        { body: commands }
                    );

                    console.log(`✅ Successfully deployed ${data.length} commands to guild.`);
                    await this.saveCache(currentHash);
                    return true;
                } else {
                    throw new Error('No valid guild ID for fallback deployment');
                }
            }

        } catch (error) {
            console.error('❌ Command deployment failed:', error.message);
            
            // Provide helpful error messages
            if (error.code === 50001) {
                console.error('💡 Missing Access: Make sure the bot has the "applications.commands" scope.');
            } else if (error.code === 10002) {
                console.error('💡 Invalid Application: Check your clientId in config.json.');
            } else if (error.code === 50035) {
                console.error('💡 Invalid Form Body: One of your commands has invalid data.');
            }
            
            return false;
        }
    }

    // Clean up cache file
    async clearCache() {
        try {
            if (await fs.pathExists(this.cacheFile)) {
                await fs.remove(this.cacheFile);
                console.log('🗑️  Command cache cleared.');
            }
        } catch (error) {
            console.warn('⚠️  Could not clear command cache:', error.message);
        }
    }
}

module.exports = CommandDeployer;