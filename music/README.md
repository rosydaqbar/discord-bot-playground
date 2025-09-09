# Discord High-Quality Music Bot

A powerful Discord music bot with web UI that plays high-quality audio from your local music collection. Features intelligent fuzzy search, paginated results, and supports FLAC, MP3, M4A, WAV, and OGG formats with 48kHz sample rate for crystal-clear audio.

## 🎵 Key Features

### High-Quality Audio Engine
- **Custom Medley Integration** - Uses @seamless-medley/medley for professional audio processing
- **48kHz sample rate** for studio-quality sound
- **FLAC lossless support** with ReplayGain normalization
- **Multiple format support**: FLAC, MP3, M4A, WAV, OGG
- **Optimized FFmpeg settings** for maximum audio quality

### Intelligent Search System
- **Fuzzy Search Engine** with Levenshtein distance algorithm
- **Paginated Results** showing 25 items per page (up to 100 total)
- **Smart Ranking** - Results sorted by relevance and similarity
- **Search Caching** for faster subsequent searches
- **Typo Tolerance** - Find songs even with spelling mistakes

### Discord Commands
- `/play <filename>` - **Enhanced with fuzzy search!** Play music from your local collection
- `/queue` - View current music queue with interactive controls
- `/nowplaying` - Show current track information with controls
- `/stop` - Stop playback and clear queue
- `/skip` - Skip to next track
- `/dashboard` - Show comprehensive bot dashboard with stats
- `/logs` - View logging statistics and recent activity (Admin only)
- `/refresh` - Refresh and redeploy commands (Admin only)
- `/status` - Show bot status and current activity

### Interactive Components v2 Interface
- **Rich Interactive Messages** - Modern Discord Components v2 interface
- **Inline Playback Controls** - Pause, skip, stop directly from messages
- **Album Artwork Display** - Beautiful thumbnail integration
- **Real-time Information** - Live track info with timestamps
- **Paginated Search Results** - Navigate through search results with buttons
- **Queue Management** - Interactive queue display and controls

### Web UI Dashboard
- **Real-time server monitoring** - See all Discord servers and their status
- **Music collection browser** - Browse, search, and sort your local music
- **Remote playback control** - Play, pause, skip, stop from the web interface
- **Volume control** - Adjust volume remotely
- **Multi-server support** - Control music across multiple Discord servers
- **Responsive design** - Works on desktop and mobile

### Advanced Logging System
- **Comprehensive Event Tracking** - All interactions, commands, and music events
- **Colored Console Output** - Easy-to-read logs with emojis and colors
- **File Logging** - Daily log files with JSON format for analysis
- **Performance Metrics** - Execution times and system statistics
- **Automatic Cleanup** - Old logs are automatically cleaned (30-day retention)

## 🚀 Setup Instructions

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
  "webPort": 3005,
  "volume": 0.8,
  "audioQuality": "Medley High Quality (Int16LE, 48kHz, ReplayGain, 250ms buffer) - FLAC Lossless Supported",
  "supportedFormats": [".mp3", ".flac", ".m4a", ".wav", ".ogg"]
}
```

### 5. Add Your Music
1. Create a `music_collection` folder (or use the path specified in config)
2. Add your music files (FLAC, MP3, M4A, WAV, OGG)
3. The bot will automatically scan and index them with fuzzy search

### 6. Start the Bot
```bash
# Production (commands deploy automatically)
npm start

# Development (with auto-restart)
npm run dev

# Manual command deployment (if needed)
npm run deploy
```

**✨ Commands are deployed automatically when you start the bot!**

### 7. Access Web UI
Open your browser and go to `http://localhost:3005`

## 🎮 Usage

### Discord Commands
- Join a voice channel
- Use `/play <song name>` to search and play from your collection
  - Get up to 100 search results with intelligent fuzzy matching
  - Navigate with Previous/Next buttons (25 results per page)
  - Smart search ranking with typo tolerance
  - Select from dropdown menu to play instantly
- Control playback with interactive buttons on messages
- Check queue with `/queue` and current track with `/nowplaying`

### Web Interface
- Monitor all your Discord servers in real-time
- Browse your music collection with search and sort
- Click "Play" on any track to play it (select server if multiple)
- Use playback controls to manage music remotely
- Adjust volume with the slider

## 🔧 Technical Architecture

### Audio Processing Engine
- **Medley Core** - Professional audio library for high-quality playback
- **Discord.js Voice** - Native Discord voice connection handling
- **Custom Music Player Service** - Manages playback, queues, and connections
- **FFmpeg Integration** - Optimized audio processing and format conversion

### Search & Indexing
- **Fuzzy Search Algorithm** - Levenshtein distance for intelligent matching
- **File Indexing System** - Cached metadata parsing for fast searches
- **Metadata Extraction** - Automatic title, artist, album detection
- **Album Artwork Support** - Embedded artwork display in Discord

### File Structure
```
music/
├── src/
│   ├── commands/          # Discord slash commands
│   ├── events/           # Discord event handlers
│   ├── services/         # Music player service (Medley integration)
│   ├── utils/            # Utilities (fuzzy search, logging, metadata)
│   ├── web/              # Web API routes
│   └── index.js          # Main application
├── public/               # Web UI files
├── music_collection/     # Your music files go here
├── config.json          # Configuration
└── package.json         # Dependencies
```

## 📦 Dependencies

### Core Framework
- `discord.js` - Discord API wrapper and Components v2
- `@discordjs/voice` - Voice connection handling
- `@seamless-medley/medley` - Professional audio processing engine
- `express` - Web server framework

### Audio Processing
- `@discordjs/opus` - Opus audio codec
- `ffmpeg-static` - FFmpeg binary for audio conversion
- Custom metadata parser with fallback support

### Utilities
- `fs-extra` - Enhanced file system operations
- `cors` - Cross-origin resource sharing
- Custom fuzzy search engine with Levenshtein distance
- Comprehensive logging system with file rotation

## 🎵 Audio Quality Features

The bot is optimized for audiophile-quality playback:

### Medley Audio Engine
- **Sample Rate**: 48kHz (Discord's native rate)
- **Bit Depth**: 16-bit signed integer (Int16LE)
- **Channels**: Stereo (2 channels)
- **Buffer Size**: 1 second for stability
- **Buffering**: 250ms for low latency
- **ReplayGain**: Automatic volume normalization

### Format Support
- **FLAC** - Lossless compression (recommended for best quality)
- **MP3** - Lossy compression with high bitrate support
- **M4A** - Apple's AAC format
- **WAV** - Uncompressed PCM audio
- **OGG** - Ogg Vorbis compression

### Quality Optimizations
- Direct PCM streaming to Discord (no double encoding)
- Medley's professional audio processing
- No inline volume processing (handled by Medley)
- Zero silence padding for cleaner audio transitions

## 🔍 Enhanced Search Features

### Fuzzy Search Algorithm
- **Levenshtein Distance** - Calculates character-level differences
- **Similarity Scoring** - 0-1 scale with intelligent weighting
- **Multiple Match Types** - Filename, path, and directory matching
- **Threshold Filtering** - Minimum 30% similarity for results

### Search Result Display
- **Paginated Interface** - 25 results per page, up to 100 total
- **Similarity Percentages** - Shows match confidence
- **Directory Context** - Displays file location
- **Interactive Selection** - Dropdown menu for instant playback

### Caching System
- **File Index Cache** - 5-minute cache for file metadata
- **Search Result Cache** - 10-minute cache for user searches
- **Automatic Cleanup** - Removes old cache entries automatically

## 🚨 Troubleshooting

### Bot not responding
- Check if bot token is correct in config.json
- Ensure bot has proper permissions in Discord server
- Verify FFmpeg is installed and accessible

### Audio quality issues
- Ensure music files are not corrupted
- Check supported format extensions in config
- Verify Medley can load the audio files

### Search not finding files
- Check musicDirectory path in config.json
- Ensure files have supported extensions
- Try clearing search cache with bot restart

### Web UI not loading
- Check if port 3005 is available (or configured port)
- Ensure all dependencies are installed
- Check console for error messages

### Memory issues with large collections
- The bot indexes all files on startup
- Consider organizing music in subdirectories
- Monitor memory usage with large FLAC collections

## 📊 Performance Notes

### Recommended System Requirements
- **RAM**: 512MB minimum, 1GB+ for large collections (10,000+ files)
- **CPU**: Modern multi-core processor for real-time audio processing
- **Storage**: SSD recommended for faster file access
- **Network**: Stable internet connection for Discord voice

### Optimization Tips
- Use FLAC for best quality, MP3 for smaller file sizes
- Organize music in logical directory structures
- Keep music files on local storage (not network drives)
- Regular cleanup of log files (automatic after 30 days)

## 📝 License

MIT License - Feel free to modify and distribute.

## 🎶 Enjoy Your High-Quality Discord Music Experience!

This bot provides audiophile-quality music playback with intelligent search capabilities, making it perfect for music enthusiasts who want the best possible audio quality in Discord voice channels.