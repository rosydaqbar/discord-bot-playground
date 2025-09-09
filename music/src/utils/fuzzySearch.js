const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');

class FuzzySearch {
    constructor() {
        this.fileCache = new Map(); // Cache for file metadata
        this.lastIndexTime = 0;
        this.indexCacheTime = 5 * 60 * 1000; // 5 minutes cache
    }

    // Calculate Levenshtein distance for fuzzy matching
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

    // Index all music files with metadata
    async indexMusicFiles() {
        const now = Date.now();
        if (now - this.lastIndexTime < this.indexCacheTime && this.fileCache.size > 0) {
            console.log('🔍 Using cached file index');
            return Array.from(this.fileCache.values());
        }

        console.log('🔍 Indexing music files...');
        const musicDir = path.resolve(config.musicDirectory);

        if (!await fs.pathExists(musicDir)) {
            return [];
        }

        const files = [];
        await this.scanDirectory(musicDir, '', files);

        this.lastIndexTime = now;
        console.log(`🔍 Indexed ${files.length} music files`);
        return files;
    }

    // Recursively scan directory for music files
    async scanDirectory(dir, prefix, files) {
        try {
            const items = await fs.readdir(dir, { withFileTypes: true });

            for (const item of items) {
                if (item.isDirectory()) {
                    await this.scanDirectory(
                        path.join(dir, item.name),
                        prefix ? `${prefix}/${item.name}` : item.name,
                        files
                    );
                } else if (config.supportedFormats.some(ext => item.name.endsWith(ext))) {
                    const fullPath = path.join(dir, item.name);
                    const nameWithoutExt = path.parse(item.name).name;
                    const relativePath = prefix ? `${prefix}/${nameWithoutExt}` : nameWithoutExt;

                    // Get file stats
                    const stats = await fs.stat(fullPath);
                    
                    const fileInfo = {
                        name: nameWithoutExt,
                        relativePath: relativePath,
                        fullPath: fullPath,
                        directory: prefix || '',
                        extension: path.extname(item.name),
                        size: stats.size,
                        modified: stats.mtime
                    };

                    // Cache the file info
                    this.fileCache.set(fullPath, fileInfo);
                    files.push(fileInfo);
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dir}:`, error);
        }
    }

    // Perform fuzzy search on indexed files
    async fuzzySearch(query, limit = 10) {
        const files = await this.indexMusicFiles();
        const results = [];

        for (const file of files) {
            // Search in filename, directory, and relative path
            const nameScore = this.calculateSimilarity(query, file.name);
            const pathScore = this.calculateSimilarity(query, file.relativePath);
            const dirScore = file.directory ? this.calculateSimilarity(query, file.directory) : 0;

            // Take the best score
            const bestScore = Math.max(nameScore, pathScore, dirScore);

            if (bestScore > 0.3) { // Minimum similarity threshold
                results.push({
                    ...file,
                    similarity: bestScore,
                    matchType: nameScore === bestScore ? 'name' : 
                              pathScore === bestScore ? 'path' : 'directory'
                });
            }
        }

        // Sort by similarity score (descending)
        results.sort((a, b) => b.similarity - a.similarity);

        return results.slice(0, limit);
    }

    // Get suggestions for "Did you mean?" functionality
    async getSuggestions(query, limit = 3) {
        const results = await this.fuzzySearch(query, limit);
        return results.filter(result => result.similarity > 0.5); // Higher threshold for suggestions
    }

    // Clear cache (useful for testing or manual refresh)
    clearCache() {
        this.fileCache.clear();
        this.lastIndexTime = 0;
        console.log('🔍 File cache cleared');
    }
}

module.exports = new FuzzySearch();