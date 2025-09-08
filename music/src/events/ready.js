const { Events } = require('discord.js');
const config = require('../../config.json');
const StatusManager = require('../utils/statusManager');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log('');
        console.log('🎵 ═══════════════════════════════════════');
        console.log(`🎵 Ready! Logged in as ${client.user.tag}`);
        console.log(`🎶 Music bot is online and ready to play high-quality audio!`);
        console.log(`🌐 Web UI available at: http://localhost:${config.webPort}`);
        console.log(`📁 Music directory: ${config.musicDirectory}`);
        console.log(`🎧 Supported formats: ${config.supportedFormats.join(', ')}`);
        console.log(`🔊 Volume: ${config.volume * 100}%`);
        console.log(`🎵 Audio Quality: ${config.audioQuality}`);
        console.log(`🤖 Servers: ${client.guilds.cache.size}`);
        console.log(`👥 Users: ${client.users.cache.size}`);
        console.log('🎵 ═══════════════════════════════════════');
        console.log('');
        console.log('✅ Bot is ready! Available commands:');
        console.log('   /play <filename>  - Play from local collection');
        console.log('   /queue           - View music queue');
        console.log('   /nowplaying      - Show current track');
        console.log('   /dashboard       - Show bot dashboard');
        console.log('   /pause /resume   - Control playback');
        console.log('   /skip /stop      - Skip or stop music');
        console.log('   /volume <level>  - Set volume (0-100)');
        console.log('');
        
        // Initialize status manager and set to idle
        const statusManager = new StatusManager(client);
        client.statusManager = statusManager;
        
        // Set to idle immediately - no activity, just idle status
        statusManager.setIdle();
        
        console.log('🔄 Dynamic status management initialized - Bot set to Idle');
    },
};