const path = require('path');
const fs = require('fs-extra');
const fallbackMetadata = require('./fallbackMetadata');

class MetadataParser {
    constructor() {
        this.parseFile = null;
        this.initialized = false;
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            // Dynamic import for ES module
            const musicMetadata = await import('music-metadata');
            this.parseFile = musicMetadata.parseFile;
            this.initialized = true;
            console.log('✅ Music metadata parser initialized');
        } catch (error) {
            console.warn('⚠️  music-metadata not available, using basic file info only');
            console.warn('   Install music-metadata with: npm install music-metadata');
            this.parseFile = null;
            this.initialized = true;
        }
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initPromise;
        }
    }

    async parseFileMetadata(filePath) {
        await this.ensureInitialized();

        const basicInfo = {
            filename: path.basename(filePath),
            title: path.parse(filePath).name,
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            duration: 0,
            bitrate: 0,
            sampleRate: 0,
            format: path.extname(filePath).toLowerCase(),
            size: 0
        };

        try {
            // Get file stats
            const stats = await fs.stat(filePath);
            basicInfo.size = stats.size;
            basicInfo.dateAdded = stats.birthtime;

            // If music-metadata is available, try to parse metadata
            if (this.parseFile) {
                try {
                    const metadata = await this.parseFile(filePath);
                    
                    return {
                        ...basicInfo,
                        title: metadata.common?.title || basicInfo.title,
                        artist: metadata.common?.artist || basicInfo.artist,
                        album: metadata.common?.album || basicInfo.album,
                        duration: metadata.format?.duration ? Math.floor(metadata.format.duration) : 0,
                        bitrate: metadata.format?.bitrate || 0,
                        sampleRate: metadata.format?.sampleRate || 0,
                        genre: metadata.common?.genre?.join(', ') || 'Unknown',
                        year: metadata.common?.year || null,
                        track: metadata.common?.track?.no || null,
                        albumArtist: metadata.common?.albumartist || metadata.common?.artist || 'Unknown',
                        composer: metadata.common?.composer?.join(', ') || null,
                        comment: metadata.common?.comment?.join(' ') || null
                    };
                } catch (parseError) {
                    console.warn(`Failed to parse metadata for ${path.basename(filePath)}, using fallback:`, parseError.message);
                    // Use fallback metadata extraction
                    const fallbackData = await fallbackMetadata.extractMetadata(filePath);
                    return fallbackData || basicInfo;
                }
            } else {
                // Use fallback metadata extraction when music-metadata is not available
                const fallbackData = await fallbackMetadata.extractMetadata(filePath);
                return fallbackData || basicInfo;
            }

            return basicInfo;

        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error.message);
            return basicInfo;
        }
    }

    async parseDirectoryMetadata(directoryPath, supportedFormats) {
        await this.ensureInitialized();

        try {
            if (!await fs.pathExists(directoryPath)) {
                return [];
            }

            const files = await fs.readdir(directoryPath);
            const musicFiles = [];

            for (const file of files) {
                if (supportedFormats.some(ext => file.toLowerCase().endsWith(ext))) {
                    const filePath = path.join(directoryPath, file);
                    const metadata = await this.parseFileMetadata(filePath);
                    musicFiles.push(metadata);
                }
            }

            return musicFiles;

        } catch (error) {
            console.error('Error parsing directory metadata:', error.message);
            return [];
        }
    }

    // Get basic file info without metadata parsing (faster)
    async getBasicFileInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                filename: path.basename(filePath),
                title: path.parse(filePath).name,
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                duration: 0,
                bitrate: 0,
                sampleRate: 0,
                format: path.extname(filePath).toLowerCase(),
                size: stats.size,
                dateAdded: stats.birthtime
            };
        } catch (error) {
            console.error(`Error getting file info for ${filePath}:`, error.message);
            return null;
        }
    }

    // Check if metadata parsing is available
    isMetadataParsingAvailable() {
        return this.parseFile !== null;
    }

    // Get supported audio formats
    getSupportedFormats() {
        return ['.mp3', '.flac', '.m4a', '.wav', '.ogg', '.aac', '.wma', '.opus'];
    }

    // Format duration from seconds to readable string
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return 'Unknown';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    // Format file size to readable string
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return 'Unknown';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }

    // Format bitrate to readable string
    formatBitrate(bitrate) {
        if (!bitrate || bitrate === 0) return 'Unknown';
        return `${Math.round(bitrate)} kbps`;
    }

    // Format sample rate to readable string
    formatSampleRate(sampleRate) {
        if (!sampleRate || sampleRate === 0) return 'Unknown';
        return `${sampleRate} Hz`;
    }
}

// Create singleton instance
const metadataParser = new MetadataParser();

module.exports = metadataParser;