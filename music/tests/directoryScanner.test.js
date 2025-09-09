const fs = require('fs-extra');
const path = require('path');
const directoryScanner = require('../src/utils/directoryScanner');

// Mock config
jest.mock('../config.json', () => ({
    musicDirectory: './test_music_collection',
    supportedFormats: ['.mp3', '.flac', '.m4a', '.wav', '.ogg']
}));

describe('DirectoryScanner', () => {
    const testMusicDir = path.resolve('./test_music_collection');
    
    beforeAll(async () => {
        // Create test directory structure
        await fs.ensureDir(testMusicDir);
        await fs.ensureDir(path.join(testMusicDir, 'Album1'));
        await fs.ensureDir(path.join(testMusicDir, 'Album2'));
        await fs.ensureDir(path.join(testMusicDir, 'Artist/Album3'));
        
        // Create test music files
        await fs.writeFile(path.join(testMusicDir, 'Album1/song1.mp3'), 'test');
        await fs.writeFile(path.join(testMusicDir, 'Album1/song2.flac'), 'test');
        await fs.writeFile(path.join(testMusicDir, 'Album2/song3.m4a'), 'test');
        await fs.writeFile(path.join(testMusicDir, 'Artist/Album3/song4.wav'), 'test');
        await fs.writeFile(path.join(testMusicDir, 'Artist/Album3/song5.ogg'), 'test');
        
        // Create non-music files (should be ignored)
        await fs.writeFile(path.join(testMusicDir, 'Album1/readme.txt'), 'test');
        await fs.writeFile(path.join(testMusicDir, 'Album2/cover.jpg'), 'test');
    });

    afterAll(async () => {
        // Clean up test directory
        await fs.remove(testMusicDir);
        directoryScanner.clearCache();
    });

    beforeEach(() => {
        // Clear cache before each test
        directoryScanner.clearCache();
    });

    describe('getDirectories', () => {
        test('should return all directories with file counts', async () => {
            const directories = await directoryScanner.getDirectories();
            
            expect(directories).toHaveLength(3);
            expect(directories.find(d => d.name === 'Album1')).toMatchObject({
                name: 'Album1',
                fileCount: 2
            });
            expect(directories.find(d => d.name === 'Album2')).toMatchObject({
                name: 'Album2',
                fileCount: 1
            });
            expect(directories.find(d => d.relativePath === 'Artist/Album3')).toMatchObject({
                name: 'Album3',
                fileCount: 2
            });
        });

        test('should filter directories by query', async () => {
            const directories = await directoryScanner.getDirectories('Album1');
            
            expect(directories).toHaveLength(1);
            expect(directories[0].name).toBe('Album1');
        });

        test('should use fuzzy matching for partial queries', async () => {
            const directories = await directoryScanner.getDirectories('Alb');
            
            expect(directories.length).toBeGreaterThan(0);
            expect(directories.some(d => d.name.includes('Album'))).toBe(true);
        });

        test('should limit results to 25 directories', async () => {
            // Create many directories for this test
            for (let i = 0; i < 30; i++) {
                await fs.ensureDir(path.join(testMusicDir, `TestDir${i}`));
                await fs.writeFile(path.join(testMusicDir, `TestDir${i}/test.mp3`), 'test');
            }
            
            const directories = await directoryScanner.getDirectories();
            expect(directories.length).toBeLessThanOrEqual(25);
            
            // Clean up
            for (let i = 0; i < 30; i++) {
                await fs.remove(path.join(testMusicDir, `TestDir${i}`));
            }
        });

        test('should use cached results on subsequent calls', async () => {
            const spy = jest.spyOn(fs, 'readdir');
            
            // First call should read from filesystem
            await directoryScanner.getDirectories();
            const firstCallCount = spy.mock.calls.length;
            
            // Second call should use cache
            await directoryScanner.getDirectories();
            const secondCallCount = spy.mock.calls.length;
            
            expect(secondCallCount).toBe(firstCallCount);
            
            spy.mockRestore();
        });
    });

    describe('getMusicFilesFromDirectory', () => {
        test('should return all music files from directory', async () => {
            const album1Path = path.join(testMusicDir, 'Album1');
            const files = await directoryScanner.getMusicFilesFromDirectory(album1Path);
            
            expect(files).toHaveLength(2);
            expect(files.some(f => f.name === 'song1')).toBe(true);
            expect(files.some(f => f.name === 'song2')).toBe(true);
        });

        test('should recursively scan subdirectories', async () => {
            const artistPath = path.join(testMusicDir, 'Artist');
            const files = await directoryScanner.getMusicFilesFromDirectory(artistPath);
            
            expect(files).toHaveLength(2);
            expect(files.some(f => f.name === 'song4')).toBe(true);
            expect(files.some(f => f.name === 'song5')).toBe(true);
        });

        test('should ignore non-music files', async () => {
            const album1Path = path.join(testMusicDir, 'Album1');
            const files = await directoryScanner.getMusicFilesFromDirectory(album1Path);
            
            expect(files.every(f => !f.name.includes('readme'))).toBe(true);
        });

        test('should throw error for non-existent directory', async () => {
            const nonExistentPath = path.join(testMusicDir, 'NonExistent');
            
            await expect(directoryScanner.getMusicFilesFromDirectory(nonExistentPath))
                .rejects.toThrow('Unable to scan directory');
        });
    });

    describe('validateDirectory', () => {
        test('should validate existing directory within music collection', async () => {
            const album1Path = path.join(testMusicDir, 'Album1');
            const result = await directoryScanner.validateDirectory(album1Path);
            
            expect(result.valid).toBe(true);
            expect(result.fullPath).toBe(path.resolve(album1Path));
        });

        test('should reject directory outside music collection', async () => {
            const outsidePath = path.join(__dirname, '../');
            const result = await directoryScanner.validateDirectory(outsidePath);
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('outside of music collection');
        });

        test('should reject non-existent directory', async () => {
            const nonExistentPath = path.join(testMusicDir, 'NonExistent');
            const result = await directoryScanner.validateDirectory(nonExistentPath);
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('does not exist');
        });

        test('should reject file path (not directory)', async () => {
            const filePath = path.join(testMusicDir, 'Album1/song1.mp3');
            const result = await directoryScanner.validateDirectory(filePath);
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('not a directory');
        });
    });

    describe('calculateSimilarity', () => {
        test('should return 1.0 for exact matches', () => {
            const similarity = directoryScanner.calculateSimilarity('test', 'test');
            expect(similarity).toBe(1.0);
        });

        test('should return high score for contains matches', () => {
            const similarity = directoryScanner.calculateSimilarity('test', 'testing');
            expect(similarity).toBeGreaterThan(0.8);
        });

        test('should return lower score for fuzzy matches', () => {
            const similarity = directoryScanner.calculateSimilarity('test', 'tset');
            expect(similarity).toBeGreaterThan(0.5);
            expect(similarity).toBeLessThan(0.9);
        });

        test('should return 0 for completely different strings', () => {
            const similarity = directoryScanner.calculateSimilarity('test', 'xyz');
            expect(similarity).toBeLessThan(0.3);
        });
    });

    describe('levenshteinDistance', () => {
        test('should return 0 for identical strings', () => {
            const distance = directoryScanner.levenshteinDistance('test', 'test');
            expect(distance).toBe(0);
        });

        test('should return correct distance for different strings', () => {
            const distance = directoryScanner.levenshteinDistance('test', 'tset');
            expect(distance).toBe(2); // Two character swaps
        });

        test('should handle empty strings', () => {
            const distance = directoryScanner.levenshteinDistance('', 'test');
            expect(distance).toBe(4);
        });
    });

    describe('clearCache', () => {
        test('should clear directory cache', async () => {
            // Populate cache
            await directoryScanner.getDirectories();
            expect(directoryScanner.directoryCache.size).toBeGreaterThan(0);
            
            // Clear cache
            directoryScanner.clearCache();
            expect(directoryScanner.directoryCache.size).toBe(0);
            expect(directoryScanner.lastIndexTime).toBe(0);
        });
    });
});