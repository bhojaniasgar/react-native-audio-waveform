/**
 * Type compatibility tests for Nitro migration
 * 
 * These tests verify that:
 * 1. Nitro types are properly exported
 * 2. Legacy types remain available for backward compatibility
 * 3. Type conversions work correctly between legacy and Nitro types
 */

import type {
    AudioRecorder,
    AudioPlayer,
    WaveformExtractor,
    RecordingConfig,
    PlayerConfig,
    ExtractionConfig,
} from '../AudioWaveformTypes';

import type {
    IStartRecording,
    IPreparePlayer,
    IExtractWaveform,
} from '../AudioWaveformTypes';

describe('Type Compatibility', () => {
    describe('Nitro Types', () => {
        it('should have AudioRecorder type available', () => {
            // Type-only test - if this compiles, the type exists
            const _typeCheck: AudioRecorder | undefined = undefined;
            expect(_typeCheck).toBeUndefined();
        });

        it('should have AudioPlayer type available', () => {
            const _typeCheck: AudioPlayer | undefined = undefined;
            expect(_typeCheck).toBeUndefined();
        });

        it('should have WaveformExtractor type available', () => {
            const _typeCheck: WaveformExtractor | undefined = undefined;
            expect(_typeCheck).toBeUndefined();
        });

        it('should have RecordingConfig type available', () => {
            const config: RecordingConfig = {
                sampleRate: 44100,
                bitRate: 128000,
            };
            expect(config.sampleRate).toBe(44100);
        });

        it('should have PlayerConfig type available', () => {
            const config: PlayerConfig = {
                path: '/path/to/audio.mp3',
                volume: 0.8,
            };
            expect(config.path).toBe('/path/to/audio.mp3');
        });

        it('should have ExtractionConfig type available', () => {
            const config: ExtractionConfig = {
                path: '/path/to/audio.mp3',
                samplesPerPixel: 500,
                normalize: true,
            };
            expect(config.samplesPerPixel).toBe(500);
        });
    });

    describe('Legacy Types', () => {
        it('should have IStartRecording type available', () => {
            const config: IStartRecording = {
                path: '/path/to/recording.m4a',
                encoder: 1,
                sampleRate: 44100,
                bitRate: 128000,
                fileNameFormat: 'recording',
                useLegacy: false,
            };
            expect(config.sampleRate).toBe(44100);
        });

        it('should have IPreparePlayer type available', () => {
            const config: IPreparePlayer = {
                playerKey: 'player1',
                path: '/path/to/audio.mp3',
                volume: 0.8,
            };
            expect(config.playerKey).toBe('player1');
        });

        it('should have IExtractWaveform type available', () => {
            const config: IExtractWaveform = {
                playerKey: 'extractor1',
                path: '/path/to/audio.mp3',
                noOfSamples: 500,
            };
            expect(config.noOfSamples).toBe(500);
        });
    });

    describe('Type Conversions', () => {
        it('should allow converting legacy recording config to Nitro config', () => {
            const legacyConfig: IStartRecording = {
                path: '/path/to/recording.m4a',
                encoder: 1,
                sampleRate: 44100,
                bitRate: 128000,
                fileNameFormat: 'recording',
                useLegacy: false,
            };

            // Convert to Nitro config
            const nitroConfig: RecordingConfig = {
                path: legacyConfig.path,
                encoder: legacyConfig.encoder,
                sampleRate: legacyConfig.sampleRate,
                bitRate: legacyConfig.bitRate,
                fileNameFormat: legacyConfig.fileNameFormat,
                useLegacyNormalization: legacyConfig.useLegacy,
            };

            expect(nitroConfig.sampleRate).toBe(legacyConfig.sampleRate);
            expect(nitroConfig.useLegacyNormalization).toBe(legacyConfig.useLegacy);
        });

        it('should allow converting legacy player config to Nitro config', () => {
            const legacyConfig: IPreparePlayer = {
                playerKey: 'player1',
                path: '/path/to/audio.mp3',
                volume: 0.8,
                progress: 1000,
            };

            // Convert to Nitro config
            const nitroConfig: PlayerConfig = {
                path: legacyConfig.path,
                volume: legacyConfig.volume,
                startPosition: legacyConfig.progress,
            };

            expect(nitroConfig.path).toBe(legacyConfig.path);
            expect(nitroConfig.startPosition).toBe(legacyConfig.progress);
        });

        it('should allow converting legacy extraction config to Nitro config', () => {
            const legacyConfig: IExtractWaveform = {
                playerKey: 'extractor1',
                path: '/path/to/audio.mp3',
                noOfSamples: 500,
            };

            // Convert to Nitro config
            const nitroConfig: ExtractionConfig = {
                path: legacyConfig.path,
                samplesPerPixel: legacyConfig.noOfSamples || 500,
                normalize: true,
            };

            expect(nitroConfig.path).toBe(legacyConfig.path);
            expect(nitroConfig.samplesPerPixel).toBe(legacyConfig.noOfSamples);
        });
    });

    describe('Optional Fields', () => {
        it('should allow RecordingConfig with minimal fields', () => {
            const config: RecordingConfig = {};
            expect(config).toBeDefined();
        });

        it('should allow PlayerConfig with only required fields', () => {
            const config: PlayerConfig = {
                path: '/path/to/audio.mp3',
            };
            expect(config.path).toBe('/path/to/audio.mp3');
        });

        it('should allow ExtractionConfig with required fields', () => {
            const config: ExtractionConfig = {
                path: '/path/to/audio.mp3',
                samplesPerPixel: 500,
            };
            expect(config.samplesPerPixel).toBe(500);
        });
    });
});
