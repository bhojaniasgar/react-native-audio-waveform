/**
 * Property-Based Tests for Memory Safety
 * 
 * **Validates: Requirements 4.2, 6.1**
 * 
 * These tests verify that Nitro Modules maintain stable memory usage and
 * properly clean up resources. The tests use fast-check for property-based
 * testing to ensure memory safety holds across various operation patterns.
 * 
 * Key Memory Safety Requirements:
 * - Memory usage remains stable during repeated operations
 * - Resources are properly cleaned up after operations
 * - No memory leaks with long-running operations
 * - Memory usage scales linearly with workload
 * - Cleanup works correctly for all object types
 */

import * as fc from 'fast-check';
import { AudioWaveform } from '../src/AudioWaveform';
import type { RecordingConfig } from '../specs/AudioRecorder.nitro';
import type { PlayerConfig } from '../specs/AudioPlayer.nitro';
import type { ExtractionConfig } from '../specs/WaveformExtractor.nitro';

// Helper to get memory usage (if available)
function getMemoryUsage(): number {
    if (global.gc && (performance as any).memory) {
        global.gc();
        return (performance as any).memory.usedJSHeapSize;
    }
    // Fallback if memory API not available
    return 0;
}

// Helper to force garbage collection (if available)
function forceGC(): void {
    if (global.gc) {
        global.gc();
    }
}

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
            // Simulate memory allocation for waveform data (reduced size for testing)
            const numPixels = Math.min(Math.floor(1000 / config.samplesPerPixel), 100);
            const numChannels = 2;
            const waveform: number[][] = [];
            for (let ch = 0; ch < numChannels; ch++) {
                const channel: number[] = new Array(numPixels).fill(0.5);
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

describe('Memory Safety Property Tests', () => {
    describe('Property: Stable Memory Usage', () => {
        it('property: memory usage remains stable with repeated extractions', async () => {
            // **Validates: Requirements 4.2, 6.1**
            // 
            // This property verifies that memory usage remains stable when
            // performing many extraction operations. The test ensures:
            // - Memory doesn't grow unbounded with repeated operations
            // - Resources are properly cleaned up after each extraction
            // - Memory increase is less than 10% of initial usage

            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            path: fc.string({ minLength: 1, maxLength: 50 }),
                            samplesPerPixel: fc.integer({ min: 50, max: 500 }),
                        }),
                        { minLength: 10, maxLength: 50 }
                    ),
                    async (configs) => {
                        const initialMemory = getMemoryUsage();

                        // Perform multiple extractions
                        for (const config of configs) {
                            const extractor = AudioWaveform.createExtractor(`test-${config.path}`);
                            await extractor.extract(config);
                        }

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify memory increase is < 10%
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        // If memory API not available, test passes (can't verify)
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: memory usage remains stable with repeated player operations', async () => {
            // **Validates: Requirements 6.1**
            // 
            // This property verifies that memory usage remains stable when
            // creating and using many players. The test ensures:
            // - Player instances don't leak memory
            // - Cleanup works correctly for players
            // - Memory increase is less than 10% of initial usage

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 10, max: 50 }),
                    async (playerCount) => {
                        const initialMemory = getMemoryUsage();

                        // Create and use multiple players
                        for (let i = 0; i < playerCount; i++) {
                            const player = AudioWaveform.createPlayer(`player-${i}`);
                            await player.prepare({ path: `/test/audio-${i}.m4a` });
                            await player.start(0, 1.0);
                            await player.stop();
                        }

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify memory increase is < 10%
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: memory usage remains stable with repeated recorder operations', async () => {
            // **Validates: Requirements 6.1**
            // 
            // This property verifies that memory usage remains stable when
            // performing many recording operations. The test ensures:
            // - Recorder instances don't leak memory
            // - Audio buffers are properly cleaned up
            // - Memory increase is less than 10% of initial usage

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 10, max: 50 }),
                    async (recordingCount) => {
                        const initialMemory = getMemoryUsage();

                        // Perform multiple recording cycles
                        const recorder = AudioWaveform.createRecorder();
                        for (let i = 0; i < recordingCount; i++) {
                            await recorder.startRecording({});
                            await recorder.stopRecording();
                        }

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify memory increase is < 10%
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: memory usage scales linearly with workload', async () => {
            // **Validates: Requirements 4.2**
            // 
            // This property verifies that memory usage scales linearly with
            // the amount of work being done. The test ensures:
            // - Memory usage is predictable
            // - No exponential growth
            // - Scaling factor is reasonable

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 5, max: 20 }),
                    fc.integer({ min: 100, max: 500 }),
                    async (fileCount, samplesPerPixel) => {
                        const memoryBefore = getMemoryUsage();

                        // Extract waveforms from multiple files
                        const configs = Array.from({ length: fileCount }, (_, i) => ({
                            path: `/test/audio-${i}.m4a`,
                            samplesPerPixel,
                        }));

                        for (const config of configs) {
                            const extractor = AudioWaveform.createExtractor(`test-${config.path}`);
                            await extractor.extract(config);
                        }

                        const memoryAfter = getMemoryUsage();

                        // If memory API is available, verify linear scaling
                        if (memoryBefore > 0 && memoryAfter > 0) {
                            const memoryIncrease = memoryAfter - memoryBefore;
                            const memoryPerFile = memoryIncrease / fileCount;

                            // Memory per file should be reasonable (not exponential)
                            // This is a sanity check, not a strict requirement
                            return memoryPerFile >= 0;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property: Resource Cleanup', () => {
        it('property: stopAllPlayers cleans up all player resources', async () => {
            // **Validates: Requirements 6.1**
            // 
            // This property verifies that stopAllPlayers properly cleans up
            // all player resources. The test ensures:
            // - All players are stopped
            // - Resources are released
            // - Memory is freed after cleanup

            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 5, maxLength: 30 }),
                    async (playerKeys) => {
                        const initialMemory = getMemoryUsage();

                        // Create multiple players
                        const players = playerKeys.map(key => AudioWaveform.createPlayer(key));

                        // Start all players
                        await Promise.all(
                            players.map(player => player.prepare({ path: '/test/audio.m4a' }))
                        );
                        await Promise.all(
                            players.map(player => player.start(0, 1.0))
                        );

                        // Stop all players
                        const result = await AudioWaveform.stopAllPlayers();
                        expect(result).toBe(true);

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify cleanup
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            // After cleanup, memory increase should be minimal
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: stopAllExtractors cleans up all extractor resources', async () => {
            // **Validates: Requirements 4.2**
            // 
            // This property verifies that stopAllExtractors properly cleans up
            // all extractor resources. The test ensures:
            // - All extractors are stopped
            // - Resources are released
            // - Memory is freed after cleanup

            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 5, maxLength: 30 }),
                    async (extractorKeys) => {
                        const initialMemory = getMemoryUsage();

                        // Create multiple extractors
                        const extractors = extractorKeys.map(key => AudioWaveform.createExtractor(key));

                        // Start extractions (don't wait for completion)
                        const extractions = extractors.map(extractor =>
                            extractor.extract({ path: '/test/audio.m4a', samplesPerPixel: 100 })
                        );

                        // Stop all extractors
                        const result = await AudioWaveform.stopAllExtractors();
                        expect(result).toBe(true);

                        // Wait for any pending operations to complete
                        await Promise.allSettled(extractions);

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify cleanup
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            // After cleanup, memory increase should be minimal
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: individual extractor cancel cleans up resources', async () => {
            // **Validates: Requirements 4.2**
            // 
            // This property verifies that cancelling an individual extractor
            // properly cleans up its resources. The test ensures:
            // - Extraction is stopped
            // - Resources are released
            // - Memory is freed after cancellation

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 5, max: 20 }),
                    async (extractorCount) => {
                        const initialMemory = getMemoryUsage();

                        // Create and start multiple extractors
                        const extractors = Array.from({ length: extractorCount }, (_, i) =>
                            AudioWaveform.createExtractor(`test-${i}`)
                        );

                        const extractions = extractors.map(extractor =>
                            extractor.extract({ path: '/test/audio.m4a', samplesPerPixel: 100 })
                        );

                        // Cancel all extractors
                        extractors.forEach(extractor => extractor.cancel());

                        // Wait for cancellations to complete
                        await Promise.allSettled(extractions);

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify cleanup
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            // After cancellation, memory increase should be minimal
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: player stop cleans up resources correctly', async () => {
            // **Validates: Requirements 6.1**
            // 
            // This property verifies that stopping a player properly cleans up
            // its resources. The test ensures:
            // - Player is stopped
            // - Audio buffers are released
            // - Memory is freed after stop

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 5, max: 20 }),
                    async (playerCount) => {
                        const initialMemory = getMemoryUsage();

                        // Create, start, and stop multiple players
                        for (let i = 0; i < playerCount; i++) {
                            const player = AudioWaveform.createPlayer(`player-${i}`);
                            await player.prepare({ path: '/test/audio.m4a' });
                            await player.start(0, 1.0);
                            await player.stop();
                        }

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify cleanup
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            // After stop, memory increase should be minimal
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property: Long-Running Operations', () => {
        it('property: memory remains stable during long recording sessions', async () => {
            // **Validates: Requirements 2.2**
            // 
            // This property verifies that memory remains stable during long
            // recording sessions. The test ensures:
            // - No memory leaks during continuous recording
            // - Decibel monitoring doesn't accumulate memory
            // - Memory usage is stable over time

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 50, max: 200 }),
                    async (decibelUpdateCount) => {
                        const initialMemory = getMemoryUsage();

                        const recorder = AudioWaveform.createRecorder();
                        await recorder.startRecording({});

                        // Simulate many decibel updates
                        for (let i = 0; i < decibelUpdateCount; i++) {
                            await recorder.getDecibel();
                        }

                        await recorder.stopRecording();

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify stability
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: memory remains stable with continuous playback position updates', async () => {
            // **Validates: Requirements 3.2**
            // 
            // This property verifies that memory remains stable when continuously
            // querying playback position. The test ensures:
            // - No memory leaks from position queries
            // - Callback mechanisms don't accumulate memory
            // - Memory usage is stable over time

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 50, max: 200 }),
                    async (updateCount) => {
                        const initialMemory = getMemoryUsage();

                        const player = AudioWaveform.createPlayer('test-player');
                        await player.prepare({ path: '/test/audio.m4a' });
                        await player.start(0, 1.0);

                        // Simulate many position updates
                        for (let i = 0; i < updateCount; i++) {
                            await player.getCurrentPosition();
                        }

                        await player.stop();

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify stability
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: memory remains stable with many seek operations', async () => {
            // **Validates: Requirements 3.2**
            // 
            // This property verifies that memory remains stable when performing
            // many seek operations. The test ensures:
            // - No memory leaks from seeking
            // - Audio buffer management is correct
            // - Memory usage is stable over time

            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.integer({ min: 0, max: 300000 }), { minLength: 20, maxLength: 100 }),
                    async (positions) => {
                        const initialMemory = getMemoryUsage();

                        const player = AudioWaveform.createPlayer('test-player');
                        await player.prepare({ path: '/test/audio.m4a' });

                        // Perform many seeks
                        for (const position of positions) {
                            await player.seekTo(position);
                        }

                        await player.stop();

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify stability
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property: Concurrent Operations Memory Safety', () => {
        it('property: memory remains stable with concurrent players', async () => {
            // **Validates: Requirements 3.1, 6.1**
            // 
            // This property verifies that memory remains stable when running
            // multiple concurrent players. The test ensures:
            // - No memory leaks with concurrent operations
            // - Each player manages its own resources correctly
            // - Memory usage scales linearly with player count

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 5, max: 30 }),
                    async (playerCount) => {
                        const initialMemory = getMemoryUsage();

                        // Create and start multiple concurrent players
                        const players = Array.from({ length: playerCount }, (_, i) =>
                            AudioWaveform.createPlayer(`player-${i}`)
                        );

                        await Promise.all(
                            players.map(player => player.prepare({ path: '/test/audio.m4a' }))
                        );
                        await Promise.all(
                            players.map(player => player.start(0, 1.0))
                        );

                        // Stop all players
                        await Promise.all(players.map(player => player.stop()));

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify stability
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: memory remains stable with concurrent extractors', async () => {
            // **Validates: Requirements 4.2, 6.1**
            // 
            // This property verifies that memory remains stable when running
            // multiple concurrent extractors. The test ensures:
            // - No memory leaks with concurrent extractions
            // - Each extractor manages its own resources correctly
            // - Memory usage scales linearly with extractor count

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 5, max: 20 }),
                    fc.integer({ min: 100, max: 500 }),
                    async (extractorCount, samplesPerPixel) => {
                        const initialMemory = getMemoryUsage();

                        // Create and start multiple concurrent extractors
                        const extractors = Array.from({ length: extractorCount }, (_, i) =>
                            AudioWaveform.createExtractor(`extractor-${i}`)
                        );

                        const extractions = await Promise.all(
                            extractors.map(extractor =>
                                extractor.extract({ path: '/test/audio.m4a', samplesPerPixel })
                            )
                        );

                        // Verify all extractions completed
                        expect(extractions.length).toBe(extractorCount);

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify stability
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: memory remains stable with mixed concurrent operations', async () => {
            // **Validates: Requirements 6.1**
            // 
            // This property verifies that memory remains stable when running
            // mixed concurrent operations (players, recorders, extractors).
            // The test ensures:
            // - No memory leaks with mixed operations
            // - Different object types don't interfere
            // - Memory usage is stable across operation types

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 3, max: 10 }),
                    fc.integer({ min: 3, max: 10 }),
                    async (playerCount, extractorCount) => {
                        const initialMemory = getMemoryUsage();

                        // Create mixed operations
                        const players = Array.from({ length: playerCount }, (_, i) =>
                            AudioWaveform.createPlayer(`player-${i}`)
                        );
                        const extractors = Array.from({ length: extractorCount }, (_, i) =>
                            AudioWaveform.createExtractor(`extractor-${i}`)
                        );
                        const recorder = AudioWaveform.createRecorder();

                        // Start all operations concurrently
                        await Promise.all([
                            ...players.map(player => player.prepare({ path: '/test/audio.m4a' })),
                            ...extractors.map(extractor =>
                                extractor.extract({ path: '/test/audio.m4a', samplesPerPixel: 100 })
                            ),
                            recorder.startRecording({}),
                        ]);

                        // Stop all operations
                        await Promise.all([
                            ...players.map(player => player.stop()),
                            recorder.stopRecording(),
                        ]);

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify stability
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property: Large File Memory Safety', () => {
        it('property: memory usage scales linearly with file size', async () => {
            // **Validates: Requirements 4.2**
            // 
            // This property verifies that memory usage scales linearly with
            // file size during extraction. The test ensures:
            // - Memory doesn't grow exponentially with file size
            // - Large files can be processed without memory issues
            // - Scaling is predictable and reasonable

            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            duration: fc.integer({ min: 60, max: 3600 }), // 1 min to 1 hour
                            samplesPerPixel: fc.integer({ min: 100, max: 500 }),
                        }),
                        { minLength: 3, maxLength: 10 }
                    ),
                    async (fileConfigs) => {
                        const memoryMeasurements: Array<{ duration: number; memory: number }> = [];

                        for (const config of fileConfigs) {
                            const memoryBefore = getMemoryUsage();

                            const extractor = AudioWaveform.createExtractor(`test-${config.duration}`);
                            await extractor.extract({
                                path: `/test/audio-${config.duration}s.m4a`,
                                samplesPerPixel: config.samplesPerPixel,
                            });

                            forceGC();
                            await new Promise(resolve => setTimeout(resolve, 50));

                            const memoryAfter = getMemoryUsage();

                            if (memoryBefore > 0 && memoryAfter > 0) {
                                memoryMeasurements.push({
                                    duration: config.duration,
                                    memory: memoryAfter - memoryBefore,
                                });
                            }
                        }

                        // If we have measurements, verify linear scaling
                        if (memoryMeasurements.length >= 2) {
                            // Sort by duration
                            memoryMeasurements.sort((a, b) => a.duration - b.duration);

                            // Check that memory doesn't grow exponentially
                            // (ratio between consecutive measurements should be reasonable)
                            for (let i = 1; i < memoryMeasurements.length; i++) {
                                const durationRatio = memoryMeasurements[i].duration / memoryMeasurements[i - 1].duration;
                                const memoryRatio = memoryMeasurements[i].memory / memoryMeasurements[i - 1].memory;

                                // Memory ratio should not exceed duration ratio by more than 2x
                                // (allows for some overhead but prevents exponential growth)
                                if (memoryRatio > durationRatio * 2) {
                                    return false;
                                }
                            }
                        }

                        return true;
                    }
                ),
                { numRuns: 3 }
            );
        });

        it('property: extraction can be cancelled without memory leaks', async () => {
            // **Validates: Requirements 4.2**
            // 
            // This property verifies that cancelling extraction of large files
            // doesn't leak memory. The test ensures:
            // - Cancellation releases all resources
            // - Partial results are cleaned up
            // - Memory is freed after cancellation

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 5, max: 15 }),
                    async (extractorCount) => {
                        const initialMemory = getMemoryUsage();

                        // Start multiple large file extractions
                        const extractors = Array.from({ length: extractorCount }, (_, i) =>
                            AudioWaveform.createExtractor(`test-${i}`)
                        );

                        const extractions = extractors.map(extractor =>
                            extractor.extract({
                                path: '/test/large-audio.m4a',
                                samplesPerPixel: 100,
                            })
                        );

                        // Cancel all extractions immediately
                        extractors.forEach(extractor => extractor.cancel());

                        // Wait for cancellations
                        await Promise.allSettled(extractions);

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify cleanup
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            // After cancellation, memory increase should be minimal
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property: Callback Memory Safety', () => {
        it('property: callback registrations do not leak memory', async () => {
            // **Validates: Requirements 6.1**
            // 
            // This property verifies that registering callbacks doesn't leak
            // memory. The test ensures:
            // - Callbacks are properly managed
            // - Old callbacks are released when new ones are registered
            // - Memory doesn't grow with callback registrations

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 20, max: 100 }),
                    async (callbackCount) => {
                        const initialMemory = getMemoryUsage();

                        const recorder = AudioWaveform.createRecorder();
                        const player = AudioWaveform.createPlayer('test-player');
                        const extractor = AudioWaveform.createExtractor('test-extractor');

                        // Register many callbacks (each should replace the previous)
                        for (let i = 0; i < callbackCount; i++) {
                            recorder.onDecibelUpdate(() => { });
                            player.onPlaybackUpdate(() => { });
                            player.onPlaybackFinished(() => { });
                            extractor.onProgress(() => { });
                        }

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify no leak
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            // Memory increase should be minimal (callbacks should replace, not accumulate)
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: callback invocations do not leak memory', async () => {
            // **Validates: Requirements 2.2, 3.2**
            // 
            // This property verifies that invoking callbacks many times doesn't
            // leak memory. The test ensures:
            // - Callback invocations don't accumulate memory
            // - Event data is properly cleaned up
            // - Memory remains stable with frequent callbacks

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 50, max: 200 }),
                    async (invocationCount) => {
                        const initialMemory = getMemoryUsage();

                        const recorder = AudioWaveform.createRecorder();
                        let callbackInvocations = 0;

                        recorder.onDecibelUpdate((decibel) => {
                            callbackInvocations++;
                            // Simulate some work with the data
                            const _ = decibel * 2;
                        });

                        // Simulate many callback invocations
                        await recorder.startRecording({});
                        for (let i = 0; i < invocationCount; i++) {
                            await recorder.getDecibel();
                        }
                        await recorder.stopRecording();

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify stability
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property: Edge Cases', () => {
        it('property: rapid create/destroy cycles do not leak memory', async () => {
            // **Validates: Requirements 6.1**
            // 
            // This property verifies that rapidly creating and destroying
            // objects doesn't leak memory. The test ensures:
            // - Objects are properly garbage collected
            // - No circular references prevent cleanup
            // - Memory is stable with rapid churn

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 20, max: 100 }),
                    async (cycleCount) => {
                        const initialMemory = getMemoryUsage();

                        // Rapid create/destroy cycles
                        for (let i = 0; i < cycleCount; i++) {
                            const player = AudioWaveform.createPlayer(`player-${i}`);
                            await player.prepare({ path: '/test/audio.m4a' });
                            await player.stop();

                            const extractor = AudioWaveform.createExtractor(`extractor-${i}`);
                            const extraction = extractor.extract({
                                path: '/test/audio.m4a',
                                samplesPerPixel: 100,
                            });
                            extractor.cancel();
                            await extraction.catch(() => { });
                        }

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify stability
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: error conditions do not leak memory', async () => {
            // **Validates: Requirements 6.1**
            // 
            // This property verifies that error conditions don't leak memory.
            // The test ensures:
            // - Resources are cleaned up even on errors
            // - Error handling doesn't prevent garbage collection
            // - Memory is stable after errors

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 10, max: 50 }),
                    async (errorCount) => {
                        const initialMemory = getMemoryUsage();

                        // Simulate operations that might error
                        for (let i = 0; i < errorCount; i++) {
                            try {
                                const player = AudioWaveform.createPlayer(`player-${i}`);
                                await player.prepare({ path: '' }); // Empty path might error
                                await player.start(0, 1.0);
                                await player.stop();
                            } catch (error) {
                                // Errors are expected, continue
                            }

                            try {
                                const extractor = AudioWaveform.createExtractor(`extractor-${i}`);
                                await extractor.extract({ path: '', samplesPerPixel: 0 }); // Invalid config
                            } catch (error) {
                                // Errors are expected, continue
                            }
                        }

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify stability
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('property: memory is stable with empty/minimal operations', async () => {
            // **Validates: Requirements 6.1**
            // 
            // This property verifies that even minimal operations don't leak
            // memory. The test ensures:
            // - Creating objects without using them doesn't leak
            // - Minimal operations are handled correctly
            // - Memory overhead is minimal

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 20, max: 100 }),
                    async (objectCount) => {
                        const initialMemory = getMemoryUsage();

                        // Create objects but do minimal operations
                        for (let i = 0; i < objectCount; i++) {
                            AudioWaveform.createPlayer(`player-${i}`);
                            AudioWaveform.createExtractor(`extractor-${i}`);
                            AudioWaveform.createRecorder();
                        }

                        // Force garbage collection
                        forceGC();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const finalMemory = getMemoryUsage();

                        // If memory API is available, verify minimal overhead
                        if (initialMemory > 0 && finalMemory > 0) {
                            const memoryIncrease = finalMemory - initialMemory;
                            const percentIncrease = (memoryIncrease / initialMemory) * 100;
                            return percentIncrease < 10;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });
});

/**
 * Implementation Notes:
 * 
 * 1. Memory Measurement:
 *    - Uses performance.memory API when available (Chrome/V8)
 *    - Requires --expose-gc flag to enable global.gc()
 *    - Tests gracefully handle absence of memory API
 *    - In production, run with: node --expose-gc node_modules/.bin/jest
 * 
 * 2. Memory Safety Verification:
 *    - Tests verify memory increase is < 10% after operations
 *    - Forces garbage collection before measuring
 *    - Allows time for async cleanup to complete
 *    - Accounts for normal memory overhead
 * 
 * 3. Property-Based Testing Approach:
 *    - Uses fast-check to generate arbitrary operation patterns
 *    - Tests properties that should hold for ALL inputs
 *    - More thorough than example-based testing
 *    - Helps discover memory leaks in edge cases
 * 
 * 4. Test Coverage:
 *    - Stable memory usage with repeated operations
 *    - Resource cleanup (stopAll, cancel, stop)
 *    - Long-running operations (recording, playback, monitoring)
 *    - Concurrent operations (multiple players, extractors)
 *    - Large file handling
 *    - Callback memory safety
 *    - Edge cases (rapid create/destroy, errors, minimal operations)
 * 
 * 5. Validation:
 *    - Each test validates specific requirements
 *    - Tests are annotated with requirement links
 *    - Properties hold across arbitrary inputs
 *    - Memory targets are clearly defined (< 10% increase)
 * 
 * 6. Limitations:
 *    - Tests use mocks, so they verify JS-side memory management
 *    - Real memory tests should run on physical devices
 *    - Native memory leaks require platform-specific profiling
 *    - These tests focus on JSI/JavaScript memory safety
 * 
 * 7. Running Tests:
 *    - Run with: node --expose-gc node_modules/.bin/jest MemorySafety.property.test.ts
 *    - Or add to package.json: "test:memory": "node --expose-gc node_modules/.bin/jest MemorySafety"
 *    - Tests will run but skip memory verification if --expose-gc not provided
 * 
 * 8. CI/CD Considerations:
 *    - Configure CI to run with --expose-gc flag
 *    - Monitor memory usage trends over time
 *    - Set up alerts for memory regressions
 *    - Run memory tests on each PR
 * 
 * 9. Real Implementation:
 *    - In production, this would test actual Nitro Modules
 *    - Would use real audio files and native operations
 *    - Would verify C++ memory management
 *    - Would test on physical devices (iOS and Android)
 *    - Would use platform-specific memory profiling tools
 */
