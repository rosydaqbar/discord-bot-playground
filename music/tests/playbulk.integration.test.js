const fs = require('fs-extra');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

// Mock dependencies
jest.mock('../config.json', () => ({
    musicDirectory: './test_music_collection',
    supportedFormats: ['.mp3', '.flac', '.m4a', '.wav', '.ogg']
}));

jest.mock('../src/services/musicPlayer', () => ({
    setTextChannel: jest.fn(),
    isPlaying: jest.fn(() => false),
    isPaused: jest.fn(() => false),
    playFile: jest.fn(() => Promise.resolve({
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album'
    })),
    addMultipleToQueue: jest.fn(() => Promise.resolve({
        filesAdded: 5,
        tracks: [
            { title: 'Song 1', artist: 'Artist 1' },
            { title: 'Song 2', artist: 'Artist 2' }
        ],
        newQueueLength: 5
    }))
}));

const playbulkCommand = require('../src/commands/playbulk');
const musicPlayer = require('../src/services/musicPlayer');

describe('Playbulk Command Integration', () => {
    const testMusicDir = path.resolve('./test_music_collection');
    let mockInteraction;
    let mockChannel;

    beforeAll(async () => {
        // Create test directory structure
        await fs.ensureDir(testMusicDir);
        await fs.ensureDir(path.join(testMusicDir, 'TestAlbum'));
        await fs.ensureDir(path.join(testMusicDir, 'EmptyAlbum'));
        
        // Create test music files
        await fs.writeFile(path.join(testMusicDir, 'TestAlbum/song1.mp3'), 'test');
        await fs.writeFile(path.join(testMusicDir, 'TestAlbum/song2.flac'), 'test');
        await fs.writeFile(path.join(testMusicDir, 'TestAlbum/song3.m4a'), 'test');
    });

    afterAll(async () => {
        // Clean up test directory
        await fs.remove(testMusicDir);
    });

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock Discord interaction
        mockChannel = {
            id: 'voice-channel-123',
            guild: { id: 'guild-123' }
        };

        mockInteraction = {
            member: {
                voice: { channel: mockChannel }
            },
            guildId: 'guild-123',
            channel: { id: 'text-channel-123' },
            options: {
                getString: jest.fn()
            },
            deferReply: jest.fn(),
            editReply: jest.fn(),
            respond: jest.fn()
        };
    });

    describe('Command Structure', () => {
        test('should have correct command data', () => {
            expect(playbulkCommand.data).toBeInstanceOf(SlashCommandBuilder);
            expect(playbulkCommand.data.name).toBe('playbulk');
            expect(playbulkCommand.data.description).toBe('Queue all music files from a directory');
        });

        test('should have execute and autocomplete methods', () => {
            expect(typeof playbulkCommand.execute).toBe('function');
            expect(typeof playbulkCommand.autocomplete).toBe('function');
        });
    });

    describe('Voice Channel Validation', () => {
        test('should require user to be in voice channel', async () => {
            mockInteraction.member.voice.channel = null;
            
            await playbulkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).not.toHaveBeenCalled();
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            components: expect.arrayContaining([
                                expect.objectContaining({
                                    data: expect.objectContaining({
                                        content: expect.stringContaining('Voice Channel Required')
                                    })
                                })
                            ])
                        })
                    ])
                })
            );
        });
    });

    describe('Directory Processing', () => {
        test('should process valid directory with music files', async () => {
            mockInteraction.options.getString.mockReturnValue('TestAlbum');
            
            await playbulkCommand.execute(mockInteraction);
            
            expect(mockInteraction.deferReply).toHaveBeenCalled();
            expect(musicPlayer.setTextChannel).toHaveBeenCalledWith('guild-123', mockInteraction.channel);
            expect(musicPlayer.playFile).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            components: expect.arrayContaining([
                                expect.objectContaining({
                                    data: expect.objectContaining({
                                        content: expect.stringContaining('Now Playing from Directory')
                                    })
                                })
                            ])
                        })
                    ])
                })
            );
        });

        test('should handle directory with no music files', async () => {
            mockInteraction.options.getString.mockReturnValue('EmptyAlbum');
            
            await playbulkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            components: expect.arrayContaining([
                                expect.objectContaining({
                                    data: expect.objectContaining({
                                        content: expect.stringContaining('No Music Files Found')
                                    })
                                })
                            ])
                        })
                    ])
                })
            );
        });

        test('should handle non-existent directory', async () => {
            mockInteraction.options.getString.mockReturnValue('NonExistentAlbum');
            
            await playbulkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            components: expect.arrayContaining([
                                expect.objectContaining({
                                    data: expect.objectContaining({
                                        content: expect.stringContaining('Directory Not Found')
                                    })
                                })
                            ])
                        })
                    ])
                })
            );
        });
    });

    describe('Queue Integration', () => {
        test('should add to existing queue when music is playing', async () => {
            musicPlayer.isPlaying.mockReturnValue(true);
            mockInteraction.options.getString.mockReturnValue('TestAlbum');
            
            await playbulkCommand.execute(mockInteraction);
            
            expect(musicPlayer.playFile).not.toHaveBeenCalled();
            expect(musicPlayer.addMultipleToQueue).toHaveBeenCalledWith(
                'guild-123',
                expect.arrayContaining([
                    expect.stringContaining('TestAlbum/song1.mp3'),
                    expect.stringContaining('TestAlbum/song2.flac'),
                    expect.stringContaining('TestAlbum/song3.m4a')
                ])
            );
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            components: expect.arrayContaining([
                                expect.objectContaining({
                                    data: expect.objectContaining({
                                        content: expect.stringContaining('Added to Queue')
                                    })
                                })
                            ])
                        })
                    ])
                })
            );
        });

        test('should start playing when no music is active', async () => {
            musicPlayer.isPlaying.mockReturnValue(false);
            musicPlayer.isPaused.mockReturnValue(false);
            mockInteraction.options.getString.mockReturnValue('TestAlbum');
            
            await playbulkCommand.execute(mockInteraction);
            
            expect(musicPlayer.playFile).toHaveBeenCalledWith(
                mockChannel,
                expect.stringContaining('TestAlbum'),
                mockInteraction.channel
            );
            expect(musicPlayer.addMultipleToQueue).toHaveBeenCalled();
        });
    });

    describe('Autocomplete Functionality', () => {
        test('should return directory suggestions', async () => {
            mockInteraction.options.getFocused.mockReturnValue('Test');
            
            await playbulkCommand.autocomplete(mockInteraction);
            
            expect(mockInteraction.respond).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: expect.stringContaining('TestAlbum'),
                        value: 'TestAlbum'
                    })
                ])
            );
        });

        test('should handle autocomplete errors gracefully', async () => {
            mockInteraction.options.getFocused.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            await playbulkCommand.autocomplete(mockInteraction);
            
            expect(mockInteraction.respond).toHaveBeenCalledWith([]);
        });

        test('should limit autocomplete results to 25 items', async () => {
            // Create many test directories
            for (let i = 0; i < 30; i++) {
                await fs.ensureDir(path.join(testMusicDir, `AutoTestDir${i}`));
                await fs.writeFile(path.join(testMusicDir, `AutoTestDir${i}/test.mp3`), 'test');
            }
            
            mockInteraction.options.getFocused.mockReturnValue('AutoTest');
            
            await playbulkCommand.autocomplete(mockInteraction);
            
            expect(mockInteraction.respond).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.any(Object)
                ])
            );
            
            const respondCall = mockInteraction.respond.mock.calls[0][0];
            expect(respondCall.length).toBeLessThanOrEqual(25);
            
            // Clean up
            for (let i = 0; i < 30; i++) {
                await fs.remove(path.join(testMusicDir, `AutoTestDir${i}`));
            }
        });
    });

    describe('Error Handling', () => {
        test('should handle music player errors gracefully', async () => {
            musicPlayer.playFile.mockRejectedValue(new Error('Playback failed'));
            mockInteraction.options.getString.mockReturnValue('TestAlbum');
            
            await playbulkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            components: expect.arrayContaining([
                                expect.objectContaining({
                                    data: expect.objectContaining({
                                        content: expect.stringContaining('Playback Error')
                                    })
                                })
                            ])
                        })
                    ])
                })
            );
        });

        test('should sanitize error messages', async () => {
            const errorWithPath = new Error('Error in /sensitive/path/file.mp3');
            musicPlayer.playFile.mockRejectedValue(errorWithPath);
            mockInteraction.options.getString.mockReturnValue('TestAlbum');
            
            await playbulkCommand.execute(mockInteraction);
            
            const editReplyCall = mockInteraction.editReply.mock.calls[0][0];
            const errorContent = editReplyCall.components[0].components[0].data.content;
            expect(errorContent).not.toContain('/sensitive/path');
            expect(errorContent).toContain('[path]');
        });
    });

    describe('Security Validation', () => {
        test('should reject directory names with path traversal attempts', async () => {
            mockInteraction.options.getString.mockReturnValue('../../../etc');
            
            await playbulkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            components: expect.arrayContaining([
                                expect.objectContaining({
                                    data: expect.objectContaining({
                                        content: expect.stringContaining('Invalid Directory Name')
                                    })
                                })
                            ])
                        })
                    ])
                })
            );
        });

        test('should reject directory names with invalid characters', async () => {
            mockInteraction.options.getString.mockReturnValue('test<>:"|?*');
            
            await playbulkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            components: expect.arrayContaining([
                                expect.objectContaining({
                                    data: expect.objectContaining({
                                        content: expect.stringContaining('Invalid Directory Name')
                                    })
                                })
                            ])
                        })
                    ])
                })
            );
        });
    });
});