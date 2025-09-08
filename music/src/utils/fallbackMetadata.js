const path = require('path');
const fs = require('fs-extra');

/**
 * Fallback metadata extractor that uses filename patterns and basic file info
 * when music-metadata is not available or fails
 */
class FallbackMetadata {
    
    // Extract metadata from filename patterns
    parseFilename(filename) {
        const nameWithoutExt = path.parse(filename).name;
        
        // Clean up common artifacts first
        const cleanName = nameWithoutExt
            .replace(/[\[\](){}]/g, '') // Remove brackets
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        // Common patterns:
        // "Artist - Title"
        // "Artist - Album - Track - Title"
        // "Track. Artist - Title"
        // "Artist_Title"
        // "Title (Artist)"
        // "You & I" (simple title)
        
        let artist = 'Unknown Artist';
        let title = cleanName;
        let album = 'Unknown Album';
        let track = null;
        
        // Pattern: "Artist - Title"
        if (cleanName.includes(' - ')) {
            const parts = cleanName.split(' - ');
            if (parts.length >= 2) {
                artist = parts[0].trim();
                title = parts[1].trim();
                
                // If there are more parts, try to identify album and track
                if (parts.length >= 3) {
                    // Pattern: "Artist - Album - Title" or "Artist - Track - Title"
                    const secondPart = parts[1].trim();
                    if (/^\d+$/.test(secondPart)) {
                        // Second part is a track number
                        track = parseInt(secondPart);
                        title = parts[2].trim();
                    } else {
                        // Second part is likely an album
                        album = secondPart;
                        title = parts[2].trim();
                    }
                }
            }
        }
        // Pattern: "Track. Artist - Title"
        else if (/^\d+\.\s/.test(cleanName)) {
            const match = cleanName.match(/^(\d+)\.\s*(.+)/);
            if (match) {
                track = parseInt(match[1]);
                const remainder = match[2];
                if (remainder.includes(' - ')) {
                    const parts = remainder.split(' - ');
                    artist = parts[0].trim();
                    title = parts[1].trim();
                } else {
                    title = remainder.trim();
                }
            }
        }
        // Pattern: "Artist_Title"
        else if (cleanName.includes('_')) {
            const parts = cleanName.split('_');
            if (parts.length >= 2) {
                artist = parts[0].trim();
                title = parts.slice(1).join('_').trim();
            }
        }
        // For simple titles like "You & I", keep as title with unknown artist
        else {
            title = cleanName;
            artist = 'Unknown Artist';
        }
        
        return {
            title: this.cleanString(title),
            artist: this.cleanString(artist),
            album: this.cleanString(album),
            track
        };
    }
    
    // Clean up strings by removing common artifacts
    cleanString(str) {
        if (!str) return str;
        
        return str
            .replace(/[\[\](){}]/g, '') // Remove brackets
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/^[-_\s]+|[-_\s]+$/g, '') // Trim dashes, underscores, spaces
            .trim();
    }
    
    // Estimate duration based on file size and format (very rough)
    estimateDuration(fileSize, format) {
        if (!fileSize || fileSize === 0) return 0;
        
        // Very rough estimates based on typical bitrates
        const avgBitrates = {
            '.mp3': 128, // kbps
            '.flac': 1000, // kbps (lossless)
            '.m4a': 128, // kbps
            '.wav': 1411, // kbps (uncompressed)
            '.ogg': 128, // kbps
            '.aac': 128, // kbps
            '.wma': 128 // kbps
        };
        
        const bitrate = avgBitrates[format.toLowerCase()] || 128;
        const bitsPerSecond = bitrate * 1000;
        const bytesPerSecond = bitsPerSecond / 8;
        
        return Math.floor(fileSize / bytesPerSecond);
    }
    
    // Get format-specific info
    getFormatInfo(format) {
        const formatInfo = {
            '.mp3': { type: 'Lossy', quality: 'Good', codec: 'MP3' },
            '.flac': { type: 'Lossless', quality: 'Excellent', codec: 'FLAC' },
            '.m4a': { type: 'Lossy', quality: 'Good', codec: 'AAC' },
            '.wav': { type: 'Uncompressed', quality: 'Excellent', codec: 'PCM' },
            '.ogg': { type: 'Lossy', quality: 'Good', codec: 'Vorbis' },
            '.aac': { type: 'Lossy', quality: 'Good', codec: 'AAC' },
            '.wma': { type: 'Lossy', quality: 'Fair', codec: 'WMA' },
            '.opus': { type: 'Lossy', quality: 'Excellent', codec: 'Opus' }
        };
        
        return formatInfo[format.toLowerCase()] || { type: 'Unknown', quality: 'Unknown', codec: 'Unknown' };
    }
    
    // Extract all available metadata using fallback methods
    async extractMetadata(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const filename = path.basename(filePath);
            const format = path.extname(filePath).toLowerCase();
            const parsedName = this.parseFilename(filename);
            const formatInfo = this.getFormatInfo(format);
            const estimatedDuration = this.estimateDuration(stats.size, format);
            
            return {
                filename,
                title: parsedName.title,
                artist: parsedName.artist,
                album: parsedName.album,
                duration: estimatedDuration,
                bitrate: 0, // Can't determine without parsing
                sampleRate: 0, // Can't determine without parsing
                format,
                size: stats.size,
                dateAdded: stats.birthtime,
                track: parsedName.track,
                genre: 'Unknown',
                year: null,
                albumArtist: parsedName.artist,
                composer: null,
                comment: null,
                formatInfo,
                extractionMethod: 'fallback'
            };
        } catch (error) {
            console.error(`Error extracting fallback metadata for ${filePath}:`, error.message);
            return null;
        }
    }
    
    // Test filename parsing patterns
    testPatterns() {
        const testFiles = [
            'Artist - Title.mp3',
            'Artist - Album - Title.flac',
            '01. Artist - Title.mp3',
            'Title (Artist).m4a',
            'Artist_Title.wav',
            'Complex Artist Name - Great Album - 05 - Amazing Song Title.flac'
        ];
        
        console.log('🧪 Testing filename parsing patterns:');
        testFiles.forEach(filename => {
            const parsed = this.parseFilename(filename);
            console.log(`   ${filename} →`, parsed);
        });
    }
}

module.exports = new FallbackMetadata();