import { useRef, useCallback, useMemo } from 'react';
import { AudioWaveform } from '../AudioWaveform';
import type { AudioPlayer } from '../../specs/AudioPlayer.nitro';
import type { WaveformExtractor } from '../../specs/WaveformExtractor.nitro';
import type { PlayerConfig } from '../../specs/AudioPlayer.nitro';
import { DurationType } from '../../specs/AudioPlayer.nitro';
import type { ExtractionConfig } from '../../specs/WaveformExtractor.nitro';

/**
 * Configuration for useAudioPlayer hook
 */
export interface UseAudioPlayerConfig {
  /**
   * Unique key for the player instance
   * If not provided, a default key will be used
   */
  playerKey?: string;

  /**
   * Unique key for the waveform extractor instance
   * If not provided, a default key will be used
   */
  extractorKey?: string;
}

/**
 * Hook for audio playback and waveform extraction using Nitro Modules
 * 
 * This hook provides a simplified interface for audio playback with
 * automatic instance management and Nitro callbacks.
 * 
 * @example
 * ```tsx
 * const { 
 *   preparePlayer, 
 *   playPlayer, 
 *   onPlaybackUpdate,
 *   onPlaybackFinished 
 * } = useAudioPlayer({ playerKey: 'player1' });
 * 
 * // Prepare player
 * await preparePlayer({ 
 *   path: '/path/to/audio.mp3',
 *   volume: 0.8 
 * });
 * 
 * // Monitor playback
 * onPlaybackUpdate((position) => {
 *   console.log('Position:', position);
 * });
 * 
 * onPlaybackFinished(() => {
 *   console.log('Playback completed');
 * });
 * 
 * // Start playback
 * await playPlayer({ finishMode: 0, speed: 1.0 });
 * ```
 */
export const useAudioPlayer = (config?: UseAudioPlayerConfig) => {
  const playerKey = useMemo(() => config?.playerKey || 'default-player', [config?.playerKey]);
  const extractorKey = useMemo(() => config?.extractorKey || 'default-extractor', [config?.extractorKey]);

  const playerRef = useRef<AudioPlayer | null>(null);
  const extractorRef = useRef<WaveformExtractor | null>(null);

  /**
   * Get or create the player instance
   */
  const getPlayer = useCallback((): AudioPlayer => {
    if (!playerRef.current) {
      playerRef.current = AudioWaveform.createPlayer(playerKey);
    }
    return playerRef.current;
  }, [playerKey]);

  /**
   * Get or create the extractor instance
   */
  const getExtractor = useCallback((): WaveformExtractor => {
    if (!extractorRef.current) {
      extractorRef.current = AudioWaveform.createExtractor(extractorKey);
    }
    return extractorRef.current;
  }, [extractorKey]);

  /**
   * Prepare the player with the specified configuration
   */
  const preparePlayer = useCallback(async (config: PlayerConfig) => {
    const player = getPlayer();
    return player.prepare(config);
  }, [getPlayer]);

  /**
   * Start or resume playback
   */
  const playPlayer = useCallback(async (options: { finishMode?: number; speed?: number } = {}) => {
    const player = getPlayer();
    const finishMode = options.finishMode ?? 0;
    const speed = options.speed ?? 1.0;
    return player.start(finishMode, speed);
  }, [getPlayer]);

  /**
   * Pause playback
   */
  const pausePlayer = useCallback(async () => {
    const player = getPlayer();
    return player.pause();
  }, [getPlayer]);

  /**
   * Stop playback
   */
  const stopPlayer = useCallback(async () => {
    const player = getPlayer();
    return player.stop();
  }, [getPlayer]);

  /**
   * Seek to a specific position
   */
  const seekToPlayer = useCallback(async (position: number) => {
    const player = getPlayer();
    return player.seekTo(position);
  }, [getPlayer]);

  /**
   * Set playback volume
   */
  const setVolume = useCallback(async (volume: number) => {
    const player = getPlayer();
    return player.setVolume(volume);
  }, [getPlayer]);

  /**
   * Set playback speed
   */
  const setPlaybackSpeed = useCallback(async (speed: number) => {
    const player = getPlayer();
    return player.setPlaybackSpeed(speed);
  }, [getPlayer]);

  /**
   * Get audio duration
   */
  const getDuration = useCallback(async (type: DurationType = DurationType.Max) => {
    const player = getPlayer();
    return player.getDuration(type);
  }, [getPlayer]);

  /**
   * Get current playback position
   */
  const getCurrentPosition = useCallback(async () => {
    const player = getPlayer();
    return player.getCurrentPosition();
  }, [getPlayer]);

  /**
   * Check if player is currently playing
   */
  const isPlaying = useCallback(() => {
    const player = getPlayer();
    return player.isPlaying();
  }, [getPlayer]);

  /**
   * Register callback for playback position updates
   * Uses Nitro's direct JSI callbacks for minimal latency
   */
  const onPlaybackUpdate = useCallback((callback: (position: number) => void) => {
    const player = getPlayer();
    player.onPlaybackUpdate(callback);
  }, [getPlayer]);

  /**
   * Register callback for playback completion
   * Uses Nitro's direct JSI callbacks
   */
  const onPlaybackFinished = useCallback((callback: () => void) => {
    const player = getPlayer();
    player.onPlaybackFinished(callback);
  }, [getPlayer]);

  /**
   * Extract waveform data from an audio file
   */
  const extractWaveformData = useCallback(async (config: ExtractionConfig) => {
    const extractor = getExtractor();
    return extractor.extract(config);
  }, [getExtractor]);

  /**
   * Register callback for extraction progress updates
   */
  const onExtractionProgress = useCallback((callback: (progress: number) => void) => {
    const extractor = getExtractor();
    extractor.onProgress(callback);
  }, [getExtractor]);

  /**
   * Cancel ongoing extraction
   */
  const cancelExtraction = useCallback(() => {
    const extractor = getExtractor();
    extractor.cancel();
  }, [getExtractor]);

  /**
   * Stop all active players
   */
  const stopAllPlayers = useCallback(async () => {
    return AudioWaveform.stopAllPlayers();
  }, []);

  /**
   * Stop all active extractors
   */
  const stopAllExtractors = useCallback(async () => {
    return AudioWaveform.stopAllExtractors();
  }, []);

  /**
   * Stop all players and extractors
   */
  const stopPlayersAndExtractors = useCallback(async () => {
    return Promise.all([stopAllPlayers(), stopAllExtractors()]);
  }, [stopAllPlayers, stopAllExtractors]);

  // Legacy API compatibility - these methods maintain the old interface
  // but map to the new Nitro callbacks

  /**
   * @deprecated Use onPlaybackFinished instead
   * Legacy compatibility: Maps to onPlaybackFinished callback
   */
  const onDidFinishPlayingAudio = useCallback((callback: (result: { playerKey: string; finishType: number }) => void) => {
    const player = getPlayer();
    player.onPlaybackFinished(() => {
      callback({ playerKey, finishType: 0 });
    });
  }, [getPlayer, playerKey]);

  /**
   * @deprecated Use onPlaybackUpdate instead
   * Legacy compatibility: Maps to onPlaybackUpdate callback
   */
  const onCurrentDuration = useCallback((callback: (result: { playerKey: string; currentDuration: number }) => void) => {
    const player = getPlayer();
    player.onPlaybackUpdate((position) => {
      callback({ playerKey, currentDuration: position });
    });
  }, [getPlayer, playerKey]);

  /**
   * @deprecated Use onExtractionProgress instead
   * Legacy compatibility: Maps to onExtractionProgress callback
   */
  const onCurrentExtractedWaveformData = useCallback((callback: (result: { playerKey: string; waveformData: number[]; progress: number }) => void) => {
    const extractor = getExtractor();
    let lastWaveformData: number[][] = [];

    extractor.onProgress((progress) => {
      // Note: This is a compatibility shim. The new API doesn't provide incremental waveform data.
      // The full waveform is returned by the extract() promise.
      callback({
        playerKey: extractorKey,
        waveformData: lastWaveformData[0] || [],
        progress
      });
    });
  }, [getExtractor, extractorKey]);

  /**
   * @deprecated Recording waveform monitoring should use useAudioRecorder hook
   * Legacy compatibility: This is now handled by the recorder's onDecibelUpdate
   */
  const onCurrentRecordingWaveformData = useCallback((_callback: (result: { currentDecibel: number }) => void) => {
    console.warn('[useAudioPlayer] onCurrentRecordingWaveformData is deprecated. Use useAudioRecorder().onDecibelUpdate() instead.');
    // This is a no-op for compatibility - recording monitoring is now in useAudioRecorder
  }, []);

  /**
   * @deprecated No longer needed with Nitro architecture
   * Legacy compatibility: No-op for backward compatibility
   */
  const markPlayerAsUnmounted = useCallback(() => {
    // No-op: Nitro handles lifecycle automatically
  }, []);

  return {
    // Modern Nitro API
    preparePlayer,
    playPlayer,
    pausePlayer,
    stopPlayer,
    seekToPlayer,
    setVolume,
    setPlaybackSpeed,
    getDuration,
    getCurrentPosition,
    isPlaying,
    onPlaybackUpdate,
    onPlaybackFinished,
    extractWaveformData,
    onExtractionProgress,
    cancelExtraction,
    stopAllPlayers,
    stopAllExtractors,
    stopPlayersAndExtractors,

    // Legacy API compatibility (deprecated)
    onDidFinishPlayingAudio,
    onCurrentDuration,
    onCurrentExtractedWaveformData,
    onCurrentRecordingWaveformData,
    markPlayerAsUnmounted,

    // Alias for backward compatibility
    stopAllWaveFormExtractors: stopAllExtractors,
  };
};
