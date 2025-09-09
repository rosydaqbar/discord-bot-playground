const fs = require('fs-extra');
const path = require('path');
const directoryScanner = require('../src/utils/directoryScanner');
const musicPlayer = require('../src/services/musicPlayer');

// Mock config for performance testing
jest.mock('../config.json', () => ({
    musicDirectory: './test_performance_collection',
    supportedFormats: ['.mp3', '.flac', '.m4a', '.wav', '.ogg']
}));

describe('Performance Tests', () => {
    const testMusicDir = path.resolve('./test_performance_collection');
    
    beforeAll(async () => {
        // Create large test directory structure for performance testing
        await fs.ensureDir(testMusicDir);
        
        // Create 50 directories with 20 files each (1000 total files)
        for (let i = 0; i < 50; i++) {
            const dirPath = path.join(testMusicDir, `Album${i.toString().padStart(2, '0')}`);
            await fs.ensureDir(dirPath);
            
            for (let j = 0; j < 20; j++) {
                const fileName = `song${j.toString().padStart(2, '0')}.mp3`;
                await fs.writeFile(path.join(dirPath, fileName), 'test content');
            }
        }
        
        // Create nested directory structure
        for (let i = 0; i < 10; i++) {
            const artistDir = path.join(testMusicDir, `Artist${i}`);
            await fs.ensureDir(artistDir);
            
            for (let j = 0; j < 5; j++) {
                const albumDir = path.join(artistDir, `Album${j}`);
                await fs.ensureDir(albumDir);
                
                for (let k = 0; k < 10; k++) {
                    const fileName = `track${k.toString().padStart(2, '0')}.flac`;
                    await fs.writeFile(path.join(albumDir, fileName), 'test content');
                }
            }
        }
    });

    afterAll(async () => {
        // Clean up test directory
        await fs.remove(testMusicDir);
        directoryScanner.clearCache();
    });

    beforeEach(() => {
        directoryScanner.clearCache();
    });

    describe('Directory Scanning Performance', () => {
        test('should scan large directory structure within reasonable time', async () => {
            const startTime = Date.now();
            
            const directories = await directoryScanner.getDirectories();
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete within 5 seconds for 1000+ files
            expect(duration).toBeLessThan(5000);
            expect(directories.length).toBeGreaterThan(0);
            
            console.log(`Directory scan completed in ${duration}ms for ${directories.length} directories`);
        });

        test('should use caching effectively for repeated calls', async () => {
            // First call (cold cache)
            const startTime1 = Date.now();
            await directoryScanner.getDirectories();
            const duration1 = Date.now() - startTime1;
            
            // Second call (warm cache)
            const startTime2 = Date.now();
            await directoryScanner.getDirectories();
            const duration2 = Date.now() - startTime2;
            
            // Cached call should be significantly faster
            expect(duration2).toBeLessThan(duration1 * 0.1); // At least 10x faster
            
            console.log(`Cold cache: ${duration1}ms, Warm cache: ${duration2}ms`);
        });

        test('should handle deep nested directories efficiently', async () => {
            const startTime = Date.now();
            
            const nestedDir = path.join(testMusicDir, 'Artist0/Album0');
            const files = await directoryScanner.getMusicFilesFromDirectory(nestedDir);
            
            const duration = Date.now() - startTime;
            
            // Should complete within 1 second for nested directory
            expect(duration).toBeLessThan(1000);
            expect(files.length).toBe(10);
            
            console.log(`Nested directory scan completed in ${duration}ms for ${files.length} files`);
        });

        test('should limit autocomplete results efficiently', async () => {
            const startTime = Date.now();
            
            const directories = await directoryScanner.getDirectories('Album');
            
            const duration = Date.now() - startTime;
            
            // Should complete quickly and limit results
            expect(duration).toBeLessThan(2000);
            expect(directories.length).toBeLessThanOrEqual(25);
            
            console.log(`Autocomplete filtering completed in ${duration}ms for ${directories.length} results`);
        });
    });

    describe('Bulk Queue Performance', () => {
        test('should handle large file arrays efficiently', async () => {
            // Create array of 100 file paths
            const filePaths = [];
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 20; j++) {
                    const fileName = `song${j.toString().padStart(2, '0')}.mp3`;
                    filePaths.push(path.join(testMusicDir, `Album${i.toString().padStart(2, '0')}`, fileName));
                }
            }
            
            // Mock the music player methods for performance testing
            const mockMusicPlayer = {
                initializeForGuild: jest.fn().mockResolvedValue(undefined),
                queues: new Map([['test-guild', { add: jest.fn() }]]),
                customQueues: new Map([['test-guild', []]]),
                clearAutoDisconnectTimer: jest.fn(),
                getMetadata: jest.fn().mockResolvedValue({
                    title: 'Test Song',
                    artist: 'Test Artist',
                    album: 'Test Album'
                }),
                extractArtwork: jest.fn().mockResolvedValue(null)
            };
            
            // Mock fs.pathExists and Medley.isTrackLoadable
            jest.spyOn(fs, 'pathExists').mockResolvedValue(true);
            const mockMedley = { isTrackLoadable: jest.fn().mockReturnValue(true) };
            
            const startTime = Date.now();
            
            // Simulate bulk queue operation
            let filesAdded = 0;
            const batchSize = 10;
            
            for (let i = 0; i < filePaths.length; i += batchSize) {
                const batch = filePaths.slice(i, i + batchSize);
                
                for (const filePath of batch) {
                    if (await fs.pathExists(filePath)) {
                        mockMusicPlayer.customQueues.get('test-guild').push(filePath);
                        filesAdded++;
                    }
                }
                
                // Small delay between batches
                if (i + batchSize < filePaths.length) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete within 3 seconds for 100 files
            expect(duration).toBeLessThan(3000);
            expect(filesAdded).toBe(100);
            
            console.log(`Bulk queue operation completed in ${duration}ms for ${filesAdded} files`);
            
            // Restore mocks
            fs.pathExists.mockRestore();
        });

        test('should handle memory efficiently with large collections', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Scan all directories (should be 100+ directories)
            const directories = await directoryScanner.getDirectories();
            
            // Get files from multiple directories
            const allFiles = [];
            for (let i = 0; i < Math.min(10, directories.length); i++) {
                const dir = directories[i];
                const files = await directoryScanner.getMusicFilesFromDirectory(dir.path);
                allFiles.push(...files);
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (less than 50MB for test data)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
            
            console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB for ${allFiles.length} files`);
        });
    });

    describe('Fuzzy Search Performance', () => {
        test('should perform fuzzy matching efficiently on large dataset', async () => {
            const directories = await directoryScanner.getDirectories();
            
            const startTime = Date.now();
            
            // Test fuzzy search with various queries
            const queries = ['Album', 'Artist', 'Test', 'Music', 'Song'];
            
            for (const query of queries) {
                const results = await directoryScanner.getDirectories(query);
                expect(results.length).toBeLessThanOrEqual(25);
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete all searches within 2 seconds
            expect(duration).toBeLessThan(2000);
            
            console.log(`Fuzzy search performance: ${duration}ms for ${queries.length} queries on ${directories.length} directories`);
        });

        test('should handle similarity calculations efficiently', async () => {
            const testStrings = [
                'Album01', 'Album02', 'Album03', 'Artist1/Album1', 'Artist2/Album2',
                'TestDirectory', 'MusicFolder', 'SongCollection', 'AudioFiles', 'Playlist'
            ];
            
            const startTime = Date.now();
            
            // Perform many similarity calculations
            let totalCalculations = 0;
            for (const str1 of testStrings) {
                for (const str2 of testStrings) {
                    directoryScanner.calculateSimilarity(str1, str2);
                    totalCalculations++;
                }
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete 100 calculations quickly
            expect(duration).toBeLessThan(100);
            expect(totalCalculations).toBe(100);
            
            console.log(`Similarity calculations: ${duration}ms for ${totalCalculations} calculations`);
        });
    });

    describe('Cache Performance', () => {
        test('should expire cache appropriately', async () => {
            // Set a very short cache time for testing
            const originalCacheTime = directoryScanner.indexCacheTime;
            directoryScanner.indexCacheTime = 100; // 100ms
            
            // First call
            await directoryScanner.getDirectories();
            expect(directoryScanner.directoryCache.size).toBeGreaterThan(0);
            
            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Second call should rebuild cache
            const startTime = Date.now();
            await directoryScanner.getDirectories();
            const duration = Date.now() - startTime;
            
            // Should take time to rebuild (not instant from cache)
            expect(duration).toBeGreaterThan(10);
            
            // Restore original cache time
            directoryScanner.indexCacheTime = originalCacheTime;
            
            console.log(`Cache rebuild took ${duration}ms after expiration`);
        });

        test('should handle cache cleanup efficiently', async () => {
            // Populate cache
            await directoryScanner.getDirectories();
            const cacheSize = directoryScanner.directoryCache.size;
            expect(cacheSize).toBeGreaterThan(0);
            
            const startTime = Date.now();
            
            // Clear cache
            directoryScanner.clearCache();
            
            const duration = Date.now() - startTime;
            
            // Cache cleanup should be very fast
            expect(duration).toBeLessThan(10);
            expect(directoryScanner.directoryCache.size).toBe(0);
            
            console.log(`Cache cleanup completed in ${duration}ms for ${cacheSize} entries`);
        });
    });
});