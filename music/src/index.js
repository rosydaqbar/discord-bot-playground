const { Client, GatewayIntentBits, Collection } = require('discord.js');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const config = require('../config.json');
const CommandDeployer = require('./utils/commandDeployer');
const logger = require('./utils/logger');
const { initializeMusicEventLogging } = require('./events/musicEvents');
const clientRegistry = require('./utils/clientRegistry');

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

// Register client in registry (no more discord-player)
clientRegistry.setClient(client);

// Initialize Express app for web UI
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store commands
client.commands = new Collection();
const commands = [];

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('📝 Loading commands...');
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`   ✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`   ⚠️  [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Initialize command deployer
const commandDeployer = new CommandDeployer(config);

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Load web routes
const webRoutes = require('./web/routes');
app.use('/api', webRoutes);

// Serve web UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start web server
app.listen(config.webPort, () => {
    console.log(`🌐 Web UI running on http://localhost:${config.webPort}`);
    console.log(`   Note: Discord features will be available once the bot connects`);
});

// Enhanced startup sequence
async function startBot() {
    try {
        await logger.info('🎵 Starting Discord Music Bot...');
        
        // Validate configuration
        if (!config.token || config.token === 'YOUR_BOT_TOKEN_HERE') {
            throw new Error('❌ Bot token not configured! Please update config.json with your bot token.');
        }
        
        if (!config.clientId || config.clientId === 'YOUR_CLIENT_ID_HERE') {
            throw new Error('❌ Client ID not configured! Please update config.json with your client ID.');
        }

        // Ensure music directory exists
        const musicDir = path.resolve(config.musicDirectory);
        await fs.ensureDir(musicDir);
        await logger.info(`📁 Music directory ready: ${musicDir}`);

        // Deploy commands before logging in
        const deploymentSuccess = await commandDeployer.deployCommands(commands);
        if (!deploymentSuccess) {
            await logger.warning('Command deployment failed, but continuing startup...');
            await logger.info('💡 You can manually deploy commands later using: node deploy-commands.js');
        }

        // Initialize music event logging
        initializeMusicEventLogging();

        // Initialize metadata parser
        const metadataParser = require('./utils/metadataParser');
        await logger.info('🎼 Initializing metadata parser...');
        // The parser initializes itself automatically

        // Login to Discord
        await logger.info('🔐 Logging in to Discord...');
        await client.login(config.token);
        
        // Set Discord client reference in music player for auto-disconnect messages
        const musicPlayer = require('./services/musicPlayer');
        musicPlayer.setDiscordClient(client);
        await logger.info('🎵 Music player initialized with Discord client');
        
        // Clean old logs on startup (keep last 30 days)
        setTimeout(async () => {
            const deletedCount = await logger.cleanOldLogs(30);
            if (deletedCount > 0) {
                await logger.info(`🧹 Cleaned ${deletedCount} old log files`);
            }
        }, 5000);
        
    } catch (error) {
        await logger.error('❌ Failed to start bot', { error: error.message, stack: error.stack });
        process.exit(1);
    }
}

// Export client only
module.exports = { client };

// Start the bot
startBot();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    const musicPlayer = require('./services/musicPlayer');
    musicPlayer.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    const musicPlayer = require('./services/musicPlayer');
    musicPlayer.shutdown();
    process.exit(0);
});