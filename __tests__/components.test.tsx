/**
 * Tests for React components using Nitro callbacks
 * Validates: Task 11.4 - Update React components
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Waveform } from '../src/components/Waveform/Waveform';
import { WaveformCandle } from '../src/components/WaveformCandle/WaveformCandle';
import { AudioWaveform } from '../src/AudioWaveform';

// Mock the AudioWaveform module
jest.mock('../src/AudioWaveform', () => ({
    AudioWaveform: {
        createPlayer: jest.fn(),
        createRecorder: jest.fn(),
        createExtractor: jest.fn(),
    },
}));

describe('Waveform Component - Nitro Callbacks', () => {
    let mockPlayer: any;
    let mockRecorder: any;
    let mockExtractor: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock instances
        mockPlayer = {
            prepare: jest.fn().mockResolvedValue(true),
            start: jest.fn().mockResolvedValue(true),
            pause: jest.fn().mockResolvedValue(true),
            stop: jest.fn().mockResolvedValue(true),
            seekTo: jest.fn().mockResolvedValue(true),
            setVolume: jest.fn().mockResolvedValue(true),
            setPlaybackSpeed: jest.fn().mockResolvedValue(true),
            getDuration: jest.fn().mockResolvedValue(60000),
            getCurrentPosition: jest.fn().mockResolvedValue(0),
            isPlaying: jest.fn().mockReturnValue(false),
            onPlaybackUpdate: jest.fn(),
            onPlaybackFinished: jest.fn(),
        };

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

        mockExtractor = {
            extract: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3, 0.4, 0.5]]),
            cancel: jest.fn(),
            onProgress: jest.fn(),
            getProgress: jest.fn().mockReturnValue(0),
        };

        // Setup factory methods
        (AudioWaveform.createPlayer as jest.Mock).mockReturnValue(mockPlayer);
        (AudioWaveform.createRecorder as jest.Mock).mockReturnValue(mockRecorder);
        (AudioWaveform.createExtractor as jest.Mock).mockReturnValue(mockExtractor);
    });

    describe('Static Mode (Player)', () => {
        it('should render without crashing', () => {
            render(
                <Waveform
                    mode="static"
                    path="/path/to/audio.mp3"
                    candleWidth={5}
                    candleSpace={2}
                />
            );
            expect(true).toBe(true);
        });

        it('should use Nitro callbacks for playback updates', async () => {
            render(
                <Waveform
                    mode="static"
                    path="/path/to/audio.mp3"
                    candleWidth={5}
                    candleSpace={2}
                />
            );

            await waitFor(() => {
                // Verify that Nitro callbacks were registered
                expect(mockPlayer.onPlaybackUpdate).toHaveBeenCalled();
                expect(mockPlayer.onPlaybackFinished).toHaveBeenCalled();
            });
        });

        it('should create player with correct key', () => {
            render(
                <Waveform
                    mode="static"
                    path="/path/to/audio.mp3"
                    candleWidth={5}
                    candleSpace={2}
                />
            );

            // Verify player was created with path-based key
            expect(AudioWaveform.createPlayer).toHaveBeenCalledWith('PlayerFor/path/to/audio.mp3');
        });
    });

    describe('Live Mode (Recorder)', () => {
        it('should render in live mode without crashing', () => {
            render(
                <Waveform
                    mode="live"
                    candleWidth={5}
                    candleSpace={2}
                    maxCandlesToRender={300}
                />
            );
            expect(true).toBe(true);
        });

        it('should use Nitro callback for decibel updates', async () => {
            render(
                <Waveform
                    mode="live"
                    candleWidth={5}
                    candleSpace={2}
                    maxCandlesToRender={300}
                />
            );

            await waitFor(() => {
                // Verify that decibel callback was registered
                expect(mockRecorder.onDecibelUpdate).toHaveBeenCalled();
            });
        });

        it('should create recorder instance', () => {
            render(
                <Waveform
                    mode="live"
                    candleWidth={5}
                    candleSpace={2}
                    maxCandlesToRender={300}
                />
            );

            // Verify recorder was created
            expect(AudioWaveform.createRecorder).toHaveBeenCalled();
        });
    });

    describe('WaveformCandle Component', () => {
        it('should render candle with correct props', () => {
            const { root } = render(
                <WaveformCandle
                    index={0}
                    amplitude={0.5}
                    parentViewLayout={{ x: 0, y: 0, width: 300, height: 100 }}
                    candleWidth={5}
                    candleSpace={2}
                    noOfSamples={50}
                    songDuration={60000}
                    currentProgress={0}
                    candleHeightScale={3}
                />
            );

            expect(root).toBeTruthy();
        });

        it('should render with custom colors', () => {
            const { root } = render(
                <WaveformCandle
                    index={10}
                    amplitude={0.5}
                    parentViewLayout={{ x: 0, y: 0, width: 300, height: 100 }}
                    candleWidth={5}
                    candleSpace={2}
                    noOfSamples={50}
                    songDuration={60000}
                    currentProgress={30000}
                    scrubColor="#FF0000"
                    waveColor="#0000FF"
                    candleHeightScale={3}
                />
            );

            expect(root).toBeTruthy();
        });
    });

    describe('Performance', () => {
        it('should render efficiently', () => {
            const startTime = performance.now();

            render(
                <Waveform
                    mode="static"
                    path="/path/to/audio.mp3"
                    candleWidth={5}
                    candleSpace={2}
                    maxCandlesToRender={300}
                />
            );

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // Rendering should complete in reasonable time
            expect(renderTime).toBeLessThan(1000);
        });

        it('should register Nitro callbacks efficiently', async () => {
            render(
                <Waveform
                    mode="static"
                    path="/path/to/audio.mp3"
                    candleWidth={5}
                    candleSpace={2}
                />
            );

            await waitFor(() => {
                expect(mockPlayer.onPlaybackUpdate).toHaveBeenCalled();
            });

            // Verify callbacks were registered once
            expect(mockPlayer.onPlaybackUpdate).toHaveBeenCalledTimes(1);
            expect(mockPlayer.onPlaybackFinished).toHaveBeenCalledTimes(1);
        });
    });

    describe('API Compatibility', () => {
        it('should maintain the same component API', () => {
            const onPlayerStateChange = jest.fn();
            const onRecorderStateChange = jest.fn();
            const onPanStateChange = jest.fn();
            const onError = jest.fn();
            const onCurrentProgressChange = jest.fn();
            const onChangeWaveformLoadState = jest.fn();

            render(
                <Waveform
                    mode="static"
                    path="/path/to/audio.mp3"
                    volume={3}
                    playbackSpeed={1.0}
                    candleSpace={2}
                    candleWidth={5}
                    waveColor="#0000FF"
                    scrubColor="#FF0000"
                    onPlayerStateChange={onPlayerStateChange}
                    onRecorderStateChange={onRecorderStateChange}
                    onPanStateChange={onPanStateChange}
                    onError={onError}
                    onCurrentProgressChange={onCurrentProgressChange}
                    candleHeightScale={3}
                    onChangeWaveformLoadState={onChangeWaveformLoadState}
                    showsHorizontalScrollIndicator={false}
                />
            );

            // All props should be accepted without errors
            expect(true).toBe(true);
        });
    });
});
