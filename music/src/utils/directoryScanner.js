const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');

class DirectoryScanner {
    constructor() {
        this.directoryCache = new Map(); // Cache for directory metadata
        this.lastIndexTime = 0;
        this.indexCacheTime = 5 * 60 * 1000; // 5 minutes cache
    }

    // Calculate Levenshtein distance for fuzzy matching (reused from fuzzySearch)
    levenshteinDistance(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[len2][len1];
    }

    // Calculate similarity score (0-1, where 1 is perfect match)
    calculateSimilarity(query, target) {
        const queryLower = query.toLowerCase();
        const targetLower = target.toLowerCase();

        // Exact match gets highest score
        if (queryLower === targetLower) return 1.0;

        // Contains match gets high score
        if (targetLower.includes(queryLower)) {
            return 0.9 - (targetLower.length - queryLower.length) / targetLower.length * 0.3;
        }

        // Fuzzy match using Levenshtein distance
        const distance = this.levenshteinDistance(queryLower, targetLower);
        const maxLength = Math.max(queryLower.length, targetLower.length);
        const similarity = 1 - distance / maxLength;

        return Math.max(0, similarity);
    }

    // Get all directories in music collection for autocomplete
    async getDirectories(query = '') {
        const now = Date.now();
        if (now - this.lastIndexTime < this.indexCacheTime && this.directoryCache.size > 0) {
            console.log('🔍 Using cached directory index');
            return this.filterDirectories(Array.from(this.directoryCache.values()), query);
        }

        console.log('🔍 Indexing directories...');
        const musicDir = path.resolve(config.musicDirectory);

        if (!await fs.pathExists(musicDir)) {
            return [];
        }

        const directories = [];
        await this.scanForDirectories(musicDir, '', directories);

        this.lastIndexTime = now;
        console.log(`🔍 Indexed ${directories.length} directories`);
        
        return this.filterDirectories(directories, query);
    }

    // Recursively scan for directories and count music files
    async scanForDirectories(dir, prefix, directories, maxDepth = 10, currentDepth = 0) {
        try {
            // Prevent infinite recursion
            if (currentDepth >= maxDepth) {
                console.warn(`Maximum directory depth reached: ${dir}`);
                return;
            }

            const items = await fs.readdir(dir, { withFileTypes: true });
            let hasDirectories = false;

            // Process directories in batches to prevent memory issues
            const directoryItems = items.filter(item => item.isDirectory());
            const batchSize = 20;

            for (let i = 0; i < directoryItems.length; i += batchSize) {
                const batch = directoryItems.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (item) => {
                    hasDirectories = true;
                    const fullPath = path.join(dir, item.name);
                    const relativePath = prefix ? `${prefix}/${item.name}` : item.name;

                    // Count music files in this directory (recursive)
                    const fileCount = await this.countMusicFiles(fullPath);

                    // Only include directories that have music files
                    if (fileCount > 0) {
                        const directoryInfo = {
                            name: item.name,
                            path: fullPath,
                            relativePath: relativePath,
                            fileCount: fileCount
                        };

                        // Cache the directory info
                        this.directoryCache.set(fullPath, directoryInfo);
                        directories.push(directoryInfo);
                    }

                    // Recursively scan subdirectories
                    await this.scanForDirectories(fullPath, relativePath, directories, maxDepth, currentDepth + 1);
                }));

                // Small delay between batches to prevent blocking
                if (i + batchSize < directoryItems.length) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dir}:`, error);
        }
    }

    // Count music files in a directory (recursive) with caching
    async countMusicFiles(dirPath, maxDepth = 5, currentDepth = 0) {
        // Check cache first
        const cacheKey = `count:${dirPath}`;
        if (this.directoryCache.has(cacheKey)) {
            return this.directoryCache.get(cacheKey);
        }

        let count = 0;
        try {
            // Prevent excessive recursion
            if (currentDepth >= maxDepth) {
                return 0;
            }

            const items = await fs.readdir(dirPath, { withFileTypes: true });

            // Process files and directories separately for better performance
            const files = items.filter(item => !item.isDirectory());
            const directories = items.filter(item => item.isDirectory());

            // Count music files in current directory
            count += files.filter(item => 
                config.supportedFormats.some(ext => item.name.endsWith(ext))
            ).length;

            // Recursively count in subdirectories (with depth limit)
            for (const dir of directories) {
                count += await this.countMusicFiles(
                    path.join(dirPath, dir.name), 
                    maxDepth, 
                    currentDepth + 1
                );
            }

            // Cache the result
            this.directoryCache.set(cacheKey, count);
        } catch (error) {
            console.error(`Error counting files in ${dirPath}:`, error);
        }
        return count;
    }

    // Filter directories based on query with fuzzy matching
    filterDirectories(directories, query) {
        if (!query) {
            // Return all directories sorted by file count (descending)
            return directories
                .sort((a, b) => b.fileCount - a.fileCount)
                .slice(0, 25);
        }

        const results = [];

        for (const directory of directories) {
            // Search in directory name and relative path
            const nameScore = this.calculateSimilarity(query, directory.name);
            const pathScore = this.calculateSimilarity(query, directory.relativePath);

            // Take the best score
            const bestScore = Math.max(nameScore, pathScore);

            if (bestScore > 0.3) { // Minimum similarity threshold
                results.push({
                    ...directory,
                    similarity: bestScore,
                    matchType: nameScore === bestScore ? 'name' : 'path'
                });
            }
        }

        // Sort by similarity score (descending), then by file count (descending)
        results.sort((a, b) => {
            if (b.similarity !== a.similarity) {
                return b.similarity - a.similarity;
            }
            return b.fileCount - a.fileCount;
        });

        return results.slice(0, 25);
    }

    // Get all music files from a specific directory (recursive)
    async getMusicFilesFromDirectory(directoryPath) {
        const musicFiles = [];
        
        try {
            await this.scanDirectoryForFiles(directoryPath, musicFiles);
            console.log(`🎵 Found ${musicFiles.length} music files in ${directoryPath}`);
            return musicFiles;
        } catch (error) {
            console.error(`Error scanning directory for files: ${directoryPath}`, error);
            throw new Error(`Unable to scan directory: ${error.message}`);
        }
    }

    // Recursively scan directory for music files
    async scanDirectoryForFiles(dir, musicFiles) {
        try {
            const items = await fs.readdir(dir, { withFileTypes: true });

            for (const item of items) {
                if (item.isDirectory()) {
                    // Recursively scan subdirectories
                    await this.scanDirectoryForFiles(path.join(dir, item.name), musicFiles);
                } else if (config.supportedFormats.some(ext => item.name.endsWith(ext))) {
                    const fullPath = path.join(dir, item.name);
                    const nameWithoutExt = path.parse(item.name).name;

                    // Get file stats
                    const stats = await fs.stat(fullPath);

                    const fileInfo = {
                        name: nameWithoutExt,
                        fullPath: fullPath,
                        extension: path.extname(item.name),
                        size: stats.size,
                        modified: stats.mtime
                    };

                    musicFiles.push(fileInfo);
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dir}:`, error);
        }
    }

    // Validate directory exists and is accessible
    async validateDirectory(directoryPath) {
        try {
            // Resolve the full path
            const fullPath = path.resolve(directoryPath);
            const musicDir = path.resolve(config.musicDirectory);

            // Security check: ensure directory is within music collection
            const relativePath = path.relative(musicDir, fullPath);
            if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
                throw new Error('Directory is outside of music collection');
            }

            // Check if directory exists
            const exists = await fs.pathExists(fullPath);
            if (!exists) {
                throw new Error('Directory does not exist');
            }

            // Check if it's actually a directory
            const stats = await fs.stat(fullPath);
            if (!stats.isDirectory()) {
                throw new Error('Path is not a directory');
            }

            // Check if directory is readable
            try {
                await fs.access(fullPath, fs.constants.R_OK);
            } catch (error) {
                throw new Error('Directory is not accessible');
            }

            return {
                valid: true,
                fullPath: fullPath,
                relativePath: path.relative(musicDir, fullPath)
            };

        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Clear cache (useful for testing or manual refresh)
    clearCache() {
        this.directoryCache.clear();
        this.lastIndexTime = 0;
        console.log('🔍 Directory cache cleared');
    }
}

module.exports = new DirectoryScanner();