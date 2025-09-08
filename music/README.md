# Discord High-Quality Music Bot

A powerful Discord music bot with web UI that supports high-quality audio streaming from your local music collection. Supports FLAC, MP3, M4A, WAV, and OGG formats with 48kHz sample rate for crystal-clear audio.

## Features

### 🎵 High-Quality Audio
- **48kHz sample rate** for studio-quality sound
- Support for **FLAC, MP3, M4A, WAV, OGG** formats
- Optimized FFmpeg settings for maximum audio quality
- Configurable bitrate and audio settings

### 🎮 Discord Commands
- `/play <query>` - Play music from online sources or search
- `/local <filename>` - Play from your local music collection (with autocomplete)
- `/pause` - Pause current playback
- `/resume` - Resume paused music
- `/skip` - Skip to next track
- `/stop` - Stop playback and clear queue
- `/queue` - View current music queue with interactive controls
- `/volume <level>` - Set volume (0-100)
- `/nowplaying` - Show current track information with controls
- `/dashboard` - Show comprehensive bot dashboard with stats
- `/logs` - View logging statistics and recent activity (Admin only)
- `/refresh` - Refresh and redeploy commands (Admin only)
- `/status` - Show bot status and current activity

### 🎛️ Interactive Components v2 Features
- **Rich Interactive Messages** - Modern Discord Components v2 interface
- **Inline Playback Controls** - Pause, skip, stop directly from messages
- **Volume Controls** - Adjust volume with +/- buttons
- **Queue Management** - Shuffle, clear, and navigate queue
- **Real-time Information** - Live track info with thumbnails
- **File Management** - Browse collection and get file details
- **Dashboard Overview** - Complete server and collection statistics

### 🌐 Web UI Dashboard
- **Real-time server monitoring** - See all Discord servers and their status
- **Music collection browser** - Browse, search, and sort your local music
- **Remote playback control** - Play, pause, skip, stop from the web interface
- **Volume control** - Adjust volume remotely
- **Multi-server support** - Control music across multiple Discord servers
- **Responsive design** - Works on desktop and mobile

### 📁 Local Music Collection
- Automatic music metadata extraction
- Support for high-quality formats (FLAC, etc.)
- File size and bitrate information
- Search and sort functionality
- Autocomplete for Discord commands

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed
- Discord Bot Token
- FFmpeg installed on your system

### 2. Discord Bot Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Go to "OAuth2" > "URL Generator"
6. Select scopes: `bot`, `applications.commands`
7. Select permissions: `Connect`, `Speak`, `Use Voice Activity`, `Send Messages`
8. Use the generated URL to invite the bot to your server

### 3. Installation
```bash
# Navigate to the music directory
cd music

# Install dependencies
npm install

# Configure the bot
# Edit config.json with your bot token and settings
```

### 4. Configuration
Edit `config.json`:
```json
{
  "token": "YOUR_BOT_TOKEN_HERE",
  "clientId": "YOUR_CLIENT_ID_HERE", 
  "guildId": "YOUR_GUILD_ID_HERE",
  "musicDirectory": "./music_collection",
  "webPort": 3000,
  "audioQuality": {
    "bitrate": "auto",
    "sampleRate": 48000,
    "channels": 2,
    "volume": 0.8
  },
  "supportedFormats": [".mp3", ".flac", ".m4a", ".wav", ".ogg"]
}
```

### 5. Add Your Music
1. Create a `music_collection` folder (or use the path specified in config)
2. Add your music files (FLAC, MP3, M4A, WAV, OGG)
3. The bot will automatically scan and index them

### 6. Start the Bot
```bash
# Production (commands deploy automatically)
npm start

# Development (with auto-restart)
npm run dev

# Manual command deployment (if needed)
npm run deploy
```

**✨ Commands are now deployed automatically when you start the bot!** No need to run a separate deployment script.

### 7. Access Web UI
Open your browser and go to `http://localhost:3000`

## Usage

### Discord Commands
- Join a voice channel
- Use `/play <song name>` to play from online sources
- Use `/local <filename>` to play from your collection (autocomplete available)
- Control playback with `/pause`, `/resume`, `/skip`, `/stop`
- Check queue with `/queue` and current track with `/nowplaying`

### Web Interface
- Monitor all your Discord servers in real-time
- Browse your music collection with search and sort
- Click "Play" on any track to play it (select server if multiple)
- Use playback controls to manage music remotely
- Adjust volume with the slider

## Audio Quality Settings

The bot is optimized for high-quality audio:
- **Sample Rate**: 48kHz (Discord's native rate)
- **Channels**: Stereo (2 channels)
- **Bitrate**: Auto-detected or configurable
- **Format Support**: FLAC (lossless), MP3, M4A, WAV, OGG

For best quality, use FLAC files which provide lossless audio compression.

## Automatic Command Deployment

The bot now automatically deploys slash commands when it starts up:

### Features:
- **Smart Caching** - Only deploys when commands change
- **Automatic Fallback** - Tries global deployment, falls back to guild
- **Error Handling** - Continues startup even if deployment fails
- **Manual Refresh** - Use `/refresh` command to redeploy (Admin only)
- **Status Feedback** - Clear console output about deployment status

### Commands:
- **Automatic** - Commands deploy when you run `npm start`
- **Manual** - Use `npm run deploy` if needed
- **Refresh** - Use `/refresh` in Discord (Admin only)
- **Clear Cache** - Use `npm run clear-cache` to force redeployment

## Discord Components v2 Interface

This bot uses Discord's latest Components v2 system for rich, interactive messages:

### Features:
- **Rich Text Display** - Markdown formatting with headers, bold, italics
- **Sectioned Content** - Organized information blocks with thumbnails
- **Interactive Buttons** - Direct playback control from messages
- **Visual Separators** - Clean content organization
- **Thumbnail Integration** - Album art and visual elements
- **Real-time Updates** - Dynamic content that reflects current state

## Dynamic Status Management

The bot automatically updates its Discord status based on music activity:

### Status States:
- **😴 Idle** - No music playing, ready to start
- **🎵 Playing** - Currently playing music with track name
- **⏸️ Paused** - Music is paused with track name
- **🔄 Loading** - Buffering or loading music

### Features:
- **Automatic Updates** - Status changes based on music activity
- **Multi-Server Support** - Shows activity from any connected server
- **Real-time Sync** - Updates within seconds of music changes
- **Manual Control** - Force status updates with `/status` command

### Benefits:
- **Better User Experience** - More intuitive and visually appealing
- **Reduced Command Usage** - Control music without typing commands
- **Rich Information Display** - More detailed track and queue information
- **Modern Interface** - Matches Discord's latest design standards

## Comprehensive Logging System

The bot includes a powerful logging system that tracks all interactions and events:

### Features:
- **Colored Console Output** - Easy-to-read logs with emojis and colors
- **File Logging** - Daily log files with JSON format for analysis
- **Smart Categorization** - Different log levels (info, success, warning, error, command, button, music)
- **Interaction Tracking** - Every slash command and button click is logged
- **Music Event Logging** - Track starts, stops, skips, errors, and queue changes
- **Web API Logging** - All web interface requests and responses
- **Performance Metrics** - Execution times for commands and operations
- **Automatic Cleanup** - Old logs are automatically cleaned (30-day retention)

### Log Categories:
- **🎵 Commands** - Slash command executions with user info and timing
- **🔘 Buttons** - Button interactions with context and results
- **🎶 Music Events** - Track changes, queue updates, voice connections
- **🌐 Web API** - Web interface requests and file operations
- **❌ Errors** - Detailed error information with stack traces
- **✅ Success** - Successful operations with performance data
- **ℹ️ System** - Bot startup, configuration, and maintenance events

### Admin Commands:
- **`/logs stats`** - View logging statistics and file information
- **`/logs recent`** - Show recent activity and interaction summary
- **`/logs clean`** - Clean old log files manually

### Example Console Output:
```
[2024-01-15 14:30:25] 🎵 [COMMAND] Slash command executed: /play
[2024-01-15 14:30:25] ✅ [SUCCESS] Command /play executed successfully (245ms)
[2024-01-15 14:30:26] 🎶 [MUSIC] Music event: Track Started
[2024-01-15 14:30:30] 🔘 [BUTTON] Button clicked: music_pause
[2024-01-15 14:30:30] ✅ [SUCCESS] Button interaction music_pause processed successfully (12ms)
```

## File Structure
```
music/
├── src/
│   ├── commands/          # Discord slash commands
│   ├── events/           # Discord event handlers
│   ├── web/              # Web API routes
│   └── index.js          # Main application
├── public/               # Web UI files
├── music_collection/     # Your music files go here
├── config.json          # Configuration
├── package.json         # Dependencies
└── deploy-commands.js   # Command deployment script
```

## Troubleshooting

### Bot not responding
- Check if bot token is correct in config.json
- Ensure bot has proper permissions in Discord server
- Run `node deploy-commands.js` to deploy commands

### Metadata extraction issues
- The bot uses `music-metadata` for extracting song information
- If metadata extraction fails, it falls back to filename parsing
- Supported filename patterns:
  - `Artist - Title.mp3`
  - `Artist - Album - Title.flac`
  - `01. Artist - Title.mp3`
  - `Title (Artist).m4a`
- Run `npm run check` to verify dependencies

### ES Module compatibility
- The bot handles ES module imports automatically
- If you see ES module errors, try: `npm install music-metadata@latest`
- The bot will work with limited metadata if imports fail
- Ensure bot has proper permissions in Discord server
- Run `node deploy-commands.js` to deploy commands

### Audio quality issues
- Ensure FFmpeg is installed and accessible
- Check if music files are not corrupted
- Verify sample rate settings in config.json

### Web UI not loading
- Check if port 3000 is available
- Ensure all dependencies are installed
- Check console for error messages

### Local files not found
- Verify musicDirectory path in config.json
- Ensure music files have supported extensions
- Check file permissions

## Dependencies

### Core
- `discord.js` - Discord API wrapper
- `discord-player` - High-level music player
- `@discordjs/voice` - Voice connection handling
- `express` - Web server framework

### Audio Processing
- `@discord-player/opus` - Opus audio codec
- `ffmpeg-static` - FFmpeg binary
- `music-metadata` - Audio metadata extraction

### Utilities
- `fs-extra` - Enhanced file system operations
- `cors` - Cross-origin resource sharing
- `libsodium-wrappers` - Encryption for voice

## License

MIT License - Feel free to modify and distribute.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Verify your configuration
3. Check Discord bot permissions
4. Ensure all dependencies are installed

Enjoy your high-quality Discord music experience! 🎵