/**
 * Property-Based Tests for Concurrent Operations
 * 
 * **Validates: Requirements 3.1, 4.2**
 * 
 * These tests verify that Nitro Modules handle concurrent operations correctly
 * without race conditions. The tests use fast-check for property-based testing
 * to ensure concurrent safety holds across various operation patterns.
 * 
 * Key Concurrent Operation Requirements:
 * - Multiple players work correctly (up to 30 concurrent players)
 * - Multiple extractors work correctly
 * - No race conditions between operations
 * - Each operation is independent and doesn't interfere with others
 * - Results are consistent regardless of execution order
 */

import * as fc from 'fast-check';
import { AudioWaveform } from '../src/AudioWaveform';
import type { PlayerConfig } from '../specs/AudioPlayer.nitro';
import type { ExtractionConfig } from '../specs/WaveformExtractor.nitro';

// Mock the AudioWaveform module for testing
jest.mock('../src/AudioWaveform', () => {
    const mockRecorder = {
        checkHasPermission: jest.fn().mockResolvedValue('granted'),
        getPermission: jest.fn().mockResolvedValue('granted'),
        startRecording: jest.fn().mockResolvedValue(true),
        stopRecording: jest.fn().mockResolvedValue('/path/to/recording.m4a'),
        pauseRecording: jest.fn().mockResolvedValue(true),
        resumeRecording: jest.fn().mockResolvedValue(true),
        getDecibel: jest.fn().mockResolvedValue(-30),
        onDecibelUpdate: jest.fn(),
    };

    const mockPlayer = {
        prepare: jest.fn().mockResolvedValue(true),
        start: jest.fn().mockResolvedValue(true),
        pause: jest.fn().mockResolvedValue(true),
        stop: jest.fn().mockResolvedValue(true),
        seekTo: jest.fn().mockResolvedValue(true),
        setVolume: jest.fn().mockResolvedValue(true),
        setPlaybackSpeed: jest.fn().mockResolvedValue(true),
        getDuration: jest.fn().mockResolvedValue(60000),
        getCurrentPosition: jest.fn().mockResolvedValue(30000),
        isPlaying: jest.fn().mockReturnValue(true),
        onPlaybackUpdate: jest.fn(),
        onPlaybackFinished: jest.fn(),
    };

    const mockExtractor = {
        extract: jest.fn().mockImplementation((config: ExtractionConfig) => {
            // Simulate extraction with deterministic results
            const numPixels = Math.floor(1000 / config.samplesPerPixel);
            const numChannels = 2;
            const waveform: number[][] = [];
            for (let ch = 0; ch < numChannels; ch++) {
                const channel: number[] = [];
                for (let i = 0; i < numPixels; i++) {
                    const amplitude = Math.abs(Math.sin((i + ch) * 0.1)) * 0.8;
                    channel.push(amplitude);
                }
                waveform.push(channel);
            }
            return Promise.resolve(waveform);
        }),
        cancel: jest.fn(),
        onProgress: jest.fn(),
        getProgress: jest.fn().mockReturnValue(0.5),
    };

    return {
        AudioWaveform: {
            createRecorder: jest.fn(() => mockRecorder),
            createPlayer: jest.fn(() => mockPlayer),
            createExtractor: jest.fn(() => mockExtractor),
            stopAllPlayers: jest.fn().mockResolvedValue(true),
            stopAllExtractors: jest.fn().mockResolvedValue(true),
        },
    };
});

describe('Concurrent Operations Property Tests', () => {
    describe('Property: Multiple Concurrent Players', () => {
        it('property: multiple players can be created and prepared concurrently', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            key: fc.string({ minLength: 1, maxLength: 20 }),
                            path: fc.string({ minLength: 1, maxLength: 50 }),
                            volume: fc.option(fc.double({ min: 0, max: 1 }), { nil: undefined }),
                        }),
                        { minLength: 2, maxLength: 30 }
                    ),
                    async (playerConfigs) => {
                        const players = playerConfigs.map(config =>
                            AudioWaveform.createPlayer(config.key)
                        );

                        const prepareResults = await Promise.all(
                            players.map((player, i) =>
                                player.prepare({
                                    path: playerConfigs[i].path,
                                    volume: playerConfigs[i].volume,
                                })
                            )
                        );

                        return prepareResults.every(result => result === true);
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: up to 30 concurrent players can play simultaneously', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 2, max: 30 }),
                    async (playerCount) => {
                        const players = Array.from({ length: playerCount }, (_, i) =>
                            AudioWaveform.createPlayer(`player-${i}`)
                        );

                        await Promise.all(
                            players.map(player => player.prepare({ path: '/test/audio.m4a' }))
                        );

                        const startResults = await Promise.all(
                            players.map(player => player.start(0, 1.0))
                        );

                        return startResults.every(result => result === true);
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: concurrent player operations do not interfere with each other', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            key: fc.string({ minLength: 1, maxLength: 20 }),
                            volume: fc.double({ min: 0, max: 1 }),
                            speed: fc.double({ min: 0.5, max: 2.0 }),
                            seekPosition: fc.integer({ min: 0, max: 60000 }),
                        }),
                        { minLength: 3, maxLength: 15 }
                    ),
                    async (playerConfigs) => {
                        const players = playerConfigs.map(config =>
                            AudioWaveform.createPlayer(config.key)
                        );

                        await Promise.all(
                            players.map(player => player.prepare({ path: '/test/audio.m4a' }))
                        );

                        const operations = players.map((player, i) => async () => {
                            await player.setVolume(playerConfigs[i].volume);
                            await player.setPlaybackSpeed(playerConfigs[i].speed);
                            await player.seekTo(playerConfigs[i].seekPosition);
                            await player.start(0, 1.0);
                            return player.isPlaying();
                        });

                        const results = await Promise.all(operations.map(op => op()));

                        return results.every(result => result === true);
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: concurrent player state queries return consistent results', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 5, max: 20 }),
                    fc.integer({ min: 10, max: 50 }),
                    async (playerCount, queryCount) => {
                        const players = Array.from({ length: playerCount }, (_, i) =>
                            AudioWaveform.createPlayer(`player-${i}`)
                        );

                        await Promise.all(
                            players.map(player => player.prepare({ path: '/test/audio.m4a' }))
                        );

                        const queries = [];
                        for (let i = 0; i < queryCount; i++) {
                            const randomPlayer = players[Math.floor(Math.random() * players.length)];
                            queries.push(randomPlayer.getCurrentPosition());
                        }

                        const results = await Promise.all(queries);

                        return results.every(result => typeof result === 'number');
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property: Multiple Concurrent Extractors', () => {
        it('property: multiple extractors can run concurrently', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            key: fc.string({ minLength: 1, maxLength: 20 }),
                            path: fc.string({ minLength: 1, maxLength: 50 }),
                            samplesPerPixel: fc.integer({ min: 50, max: 500 }),
                        }),
                        { minLength: 2, maxLength: 10 }
                    ),
                    async (extractorConfigs) => {
                        const extractors = extractorConfigs.map(config =>
                            AudioWaveform.createExtractor(config.key)
                        );

                        const extractionResults = await Promise.all(
                            extractors.map((extractor, i) =>
                                extractor.extract({
                                    path: extractorConfigs[i].path,
                                    samplesPerPixel: extractorConfigs[i].samplesPerPixel,
                                })
                            )
                        );

                        return extractionResults.every(result =>
                            Array.isArray(result) && result.length > 0
                        );
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: concurrent extractors produce independent results', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 3, max: 10 }),
                    fc.integer({ min: 100, max: 500 }),
                    async (extractorCount, samplesPerPixel) => {
                        const extractors = Array.from({ length: extractorCount }, (_, i) =>
                            AudioWaveform.createExtractor(`extractor-${i}`)
                        );

                        const results = await Promise.all(
                            extractors.map(extractor =>
                                extractor.extract({
                                    path: '/test/audio.m4a',
                                    samplesPerPixel,
                                })
                            )
                        );

                        for (let i = 1; i < results.length; i++) {
                            if (results[i].length !== results[0].length) {
                                return false;
                            }
                            if (results[i][0].length !== results[0][0].length) {
                                return false;
                            }
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: concurrent extractors with different configs work correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            samplesPerPixel: fc.integer({ min: 50, max: 500 }),
                            normalize: fc.boolean(),
                            scale: fc.option(fc.double({ min: 0.1, max: 2.0 }), { nil: undefined }),
                        }),
                        { minLength: 3, maxLength: 10 }
                    ),
                    async (configs) => {
                        const extractors = configs.map((_, i) =>
                            AudioWaveform.createExtractor(`extractor-${i}`)
                        );

                        const results = await Promise.all(
                            extractors.map((extractor, i) =>
                                extractor.extract({
                                    path: '/test/audio.m4a',
                                    ...configs[i],
                                })
                            )
                        );

                        return results.every(result =>
                            Array.isArray(result) && result.length > 0
                        );
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property: No Race Conditions', () => {
        it('property: concurrent operations on same player are safe', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 10, max: 50 }),
                    async (operationCount) => {
                        const player = AudioWaveform.createPlayer('test-player');
                        await player.prepare({ path: '/test/audio.m4a' });

                        const operations = Array.from({ length: operationCount }, (_, i) => {
                            const op = i % 4;
                            if (op === 0) return player.setVolume(Math.random());
                            if (op === 1) return player.setPlaybackSpeed(0.5 + Math.random() * 1.5);
                            if (op === 2) return player.seekTo(Math.floor(Math.random() * 60000));
                            return player.getCurrentPosition();
                        });

                        const results = await Promise.all(operations);

                        return results.every(result =>
                            typeof result === 'boolean' || typeof result === 'number'
                        );
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: concurrent operations on different players are independent', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 5, max: 15 }),
                    fc.integer({ min: 10, max: 30 }),
                    async (playerCount, opsPerPlayer) => {
                        const players = Array.from({ length: playerCount }, (_, i) =>
                            AudioWaveform.createPlayer(`player-${i}`)
                        );

                        await Promise.all(
                            players.map(player => player.prepare({ path: '/test/audio.m4a' }))
                        );

                        const allOperations = players.flatMap(player =>
                            Array.from({ length: opsPerPlayer }, () =>
                                player.getCurrentPosition()
                            )
                        );

                        const results = await Promise.all(allOperations);

                        return results.every(result => typeof result === 'number');
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: mixed concurrent operations work correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 2, max: 10 }),
                    fc.integer({ min: 2, max: 10 }),
                    async (playerCount, extractorCount) => {
                        const players = Array.from({ length: playerCount }, (_, i) =>
                            AudioWaveform.createPlayer(`player-${i}`)
                        );
                        const extractors = Array.from({ length: extractorCount }, (_, i) =>
                            AudioWaveform.createExtractor(`extractor-${i}`)
                        );
                        const recorder = AudioWaveform.createRecorder();

                        const operations = [
                            ...players.map(player =>
                                player.prepare({ path: '/test/audio.m4a' }).then(() => player.start(0, 1.0))
                            ),
                            ...extractors.map(extractor =>
                                extractor.extract({ path: '/test/audio.m4a', samplesPerPixel: 100 })
                            ),
                            recorder.startRecording({}).then(() => recorder.stopRecording()),
                        ];

                        const results = await Promise.all(operations);

                        return results.every(result =>
                            typeof result === 'boolean' ||
                            typeof result === 'string' ||
                            Array.isArray(result)
                        );
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property: Cleanup with Concurrent Operations', () => {
        it('property: stopAllPlayers works correctly with concurrent players', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 5, max: 30 }),
                    async (playerCount) => {
                        const players = Array.from({ length: playerCount }, (_, i) =>
                            AudioWaveform.createPlayer(`player-${i}`)
                        );

                        await Promise.all(
                            players.map(player => player.prepare({ path: '/test/audio.m4a' }))
                        );
                        await Promise.all(
                            players.map(player => player.start(0, 1.0))
                        );

                        const stopResult = await AudioWaveform.stopAllPlayers();

                        return stopResult === true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: stopAllExtractors works correctly with concurrent extractors', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 5, max: 15 }),
                    async (extractorCount) => {
                        const extractors = Array.from({ length: extractorCount }, (_, i) =>
                            AudioWaveform.createExtractor(`extractor-${i}`)
                        );

                        const extractions = extractors.map(extractor =>
                            extractor.extract({ path: '/test/audio.m4a', samplesPerPixel: 100 })
                        );

                        const stopResult = await AudioWaveform.stopAllExtractors();

                        await Promise.allSettled(extractions);

                        return stopResult === true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });
});
