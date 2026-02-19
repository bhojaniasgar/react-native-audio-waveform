/**
 * Tests for useAudioRecorder and useAudioPlayer hooks
 * 
 * These tests verify that the hooks correctly use Nitro callbacks
 * and maintain API compatibility with the legacy implementation.
 */

import { renderHook } from '@testing-library/react-native';
import { useAudioRecorder, useAudioPlayer } from '../src/hooks';
import { AudioWaveform } from '../src/AudioWaveform';

// Mock the AudioWaveform module
jest.mock('../src/AudioWaveform', () => ({
    AudioWaveform: {
        createRecorder: jest.fn(),
        createPlayer: jest.fn(),
        createExtractor: jest.fn(),
        stopAllPlayers: jest.fn(),
        stopAllExtractors: jest.fn(),
    },
    isNitroModulesAvailable: jest.fn(() => true),
    getNitroStatus: jest.fn(() => ({
        available: true,
        error: null,
        platform: 'ios',
        reactNativeVersion: '0.80.1',
    })),
}));

describe('useAudioRecorder', () => {
    let mockRecorder: any;

    beforeEach(() => {
        mockRecorder = {
            startRecording: jest.fn().mockResolvedValue(true),
            stopRecording: jest.fn().mockResolvedValue('/path/to/recording.m4a'),
            pauseRecording: jest.fn().mockResolvedValue(true),
            resumeRecording: jest.fn().mockResolvedValue(true),
            getDecibel: jest.fn().mockResolvedValue(-30),
            onDecibelUpdate: jest.fn(),
            checkHasPermission: jest.fn().mockResolvedValue('granted'),
            getPermission: jest.fn().mockResolvedValue('granted'),
        };

        (AudioWaveform.createRecorder as jest.Mock).mockReturnValue(mockRecorder);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a recorder instance on first use', () => {
        const { result } = renderHook(() => useAudioRecorder());

        expect(result.current).toBeDefined();
        expect(typeof result.current.startRecording).toBe('function');
        expect(typeof result.current.stopRecording).toBe('function');
    });

    it('should call startRecording with config', async () => {
        const { result } = renderHook(() => useAudioRecorder());

        const config = { sampleRate: 44100, bitRate: 128000 };
        await result.current.startRecording(config);

        expect(AudioWaveform.createRecorder).toHaveBeenCalled();
        expect(mockRecorder.startRecording).toHaveBeenCalledWith(config);
    });

    it('should call stopRecording and return file path', async () => {
        const { result } = renderHook(() => useAudioRecorder());

        const filePath = await result.current.stopRecording();

        expect(mockRecorder.stopRecording).toHaveBeenCalled();
        expect(filePath).toBe('/path/to/recording.m4a');
    });

    it('should register decibel update callback using Nitro', () => {
        const { result } = renderHook(() => useAudioRecorder());

        const callback = jest.fn();
        result.current.onDecibelUpdate(callback);

        expect(mockRecorder.onDecibelUpdate).toHaveBeenCalledWith(callback);
    });

    it('should check and request permissions', async () => {
        const { result } = renderHook(() => useAudioRecorder());

        const hasPermission = await result.current.checkHasPermission();
        expect(hasPermission).toBe('granted');
        expect(mockRecorder.checkHasPermission).toHaveBeenCalled();

        const permission = await result.current.getPermission();
        expect(permission).toBe('granted');
        expect(mockRecorder.getPermission).toHaveBeenCalled();
    });

    it('should reuse the same recorder instance across calls', async () => {
        const { result } = renderHook(() => useAudioRecorder());

        await result.current.startRecording();
        await result.current.stopRecording();

        // Should only create recorder once
        expect(AudioWaveform.createRecorder).toHaveBeenCalledTimes(1);
    });
});

describe('useAudioPlayer', () => {
    let mockPlayer: any;
    let mockExtractor: any;

    beforeEach(() => {
        mockPlayer = {
            prepare: jest.fn().mockResolvedValue(true),
            start: jest.fn().mockResolvedValue(true),
            pause: jest.fn().mockResolvedValue(true),
            stop: jest.fn().mockResolvedValue(true),
            seekTo: jest.fn().mockResolvedValue(true),
            setVolume: jest.fn().mockResolvedValue(true),
            setPlaybackSpeed: jest.fn().mockResolvedValue(true),
            getDuration: jest.fn().mockResolvedValue(180000),
            getCurrentPosition: jest.fn().mockResolvedValue(45000),
            isPlaying: jest.fn().mockReturnValue(true),
            onPlaybackUpdate: jest.fn(),
            onPlaybackFinished: jest.fn(),
        };

        mockExtractor = {
            extract: jest.fn().mockResolvedValue([[1, 2, 3], [4, 5, 6]]),
            cancel: jest.fn(),
            onProgress: jest.fn(),
            getProgress: jest.fn().mockReturnValue(0.5),
        };

        (AudioWaveform.createPlayer as jest.Mock).mockReturnValue(mockPlayer);
        (AudioWaveform.createExtractor as jest.Mock).mockReturnValue(mockExtractor);
        (AudioWaveform.stopAllPlayers as jest.Mock).mockResolvedValue(true);
        (AudioWaveform.stopAllExtractors as jest.Mock).mockResolvedValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a player instance with custom key', () => {
        const { result } = renderHook(() => useAudioPlayer({ playerKey: 'player1' }));

        expect(result.current).toBeDefined();
        expect(typeof result.current.preparePlayer).toBe('function');
    });

    it('should prepare player with config', async () => {
        const { result } = renderHook(() => useAudioPlayer());

        const config = { path: '/path/to/audio.mp3', volume: 0.8 };
        await result.current.preparePlayer(config);

        expect(AudioWaveform.createPlayer).toHaveBeenCalledWith('default-player');
        expect(mockPlayer.prepare).toHaveBeenCalledWith(config);
    });

    it('should start playback with options', async () => {
        const { result } = renderHook(() => useAudioPlayer());

        await result.current.playPlayer({ finishMode: 1, speed: 1.5 });

        expect(mockPlayer.start).toHaveBeenCalledWith(1, 1.5);
    });

    it('should register playback update callback using Nitro', () => {
        const { result } = renderHook(() => useAudioPlayer());

        const callback = jest.fn();
        result.current.onPlaybackUpdate(callback);

        expect(mockPlayer.onPlaybackUpdate).toHaveBeenCalledWith(callback);
    });

    it('should register playback finished callback using Nitro', () => {
        const { result } = renderHook(() => useAudioPlayer());

        const callback = jest.fn();
        result.current.onPlaybackFinished(callback);

        expect(mockPlayer.onPlaybackFinished).toHaveBeenCalledWith(callback);
    });

    it('should extract waveform data', async () => {
        const { result } = renderHook(() => useAudioPlayer());

        const config = { path: '/path/to/audio.mp3', samplesPerPixel: 500 };
        const waveform = await result.current.extractWaveformData(config);

        expect(AudioWaveform.createExtractor).toHaveBeenCalledWith('default-extractor');
        expect(mockExtractor.extract).toHaveBeenCalledWith(config);
        expect(waveform).toEqual([[1, 2, 3], [4, 5, 6]]);
    });

    it('should register extraction progress callback', () => {
        const { result } = renderHook(() => useAudioPlayer());

        const callback = jest.fn();
        result.current.onExtractionProgress(callback);

        expect(mockExtractor.onProgress).toHaveBeenCalledWith(callback);
    });

    it('should stop all players', async () => {
        const { result } = renderHook(() => useAudioPlayer());

        await result.current.stopAllPlayers();

        expect(AudioWaveform.stopAllPlayers).toHaveBeenCalled();
    });

    it('should stop all extractors', async () => {
        const { result } = renderHook(() => useAudioPlayer());

        await result.current.stopAllExtractors();

        expect(AudioWaveform.stopAllExtractors).toHaveBeenCalled();
    });

    it('should maintain legacy API compatibility for onDidFinishPlayingAudio', () => {
        const { result } = renderHook(() => useAudioPlayer({ playerKey: 'player1' }));

        const callback = jest.fn();
        result.current.onDidFinishPlayingAudio(callback);

        // Should register the callback with the player
        expect(mockPlayer.onPlaybackFinished).toHaveBeenCalled();

        // Simulate playback finished
        const registeredCallback = mockPlayer.onPlaybackFinished.mock.calls[0][0];
        registeredCallback();

        // Legacy callback should be called with playerKey and finishType
        expect(callback).toHaveBeenCalledWith({ playerKey: 'player1', finishType: 0 });
    });

    it('should maintain legacy API compatibility for onCurrentDuration', () => {
        const { result } = renderHook(() => useAudioPlayer({ playerKey: 'player1' }));

        const callback = jest.fn();
        result.current.onCurrentDuration(callback);

        // Should register the callback with the player
        expect(mockPlayer.onPlaybackUpdate).toHaveBeenCalled();

        // Simulate position update
        const registeredCallback = mockPlayer.onPlaybackUpdate.mock.calls[0][0];
        registeredCallback(45000);

        // Legacy callback should be called with playerKey and currentDuration
        expect(callback).toHaveBeenCalledWith({ playerKey: 'player1', currentDuration: 45000 });
    });

    it('should reuse the same player instance across calls', async () => {
        const { result } = renderHook(() => useAudioPlayer());

        await result.current.preparePlayer({ path: '/path/to/audio.mp3' });
        await result.current.playPlayer();
        await result.current.pausePlayer();

        // Should only create player once
        expect(AudioWaveform.createPlayer).toHaveBeenCalledTimes(1);
    });

    it('should use custom player key when provided', () => {
        const { result } = renderHook(() => useAudioPlayer({ playerKey: 'custom-player' }));

        result.current.preparePlayer({ path: '/path/to/audio.mp3' });

        expect(AudioWaveform.createPlayer).toHaveBeenCalledWith('custom-player');
    });
});
