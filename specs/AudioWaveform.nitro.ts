import type { HybridObject } from 'react-native-nitro-modules'
import type { AudioRecorder } from './AudioRecorder.nitro'
import type { AudioPlayer } from './AudioPlayer.nitro'
import type { WaveformExtractor } from './WaveformExtractor.nitro'

/**
 * AudioWaveform Factory Hybrid Object
 * 
 * Main entry point for the react-native-audio-waveform library.
 * Provides factory methods to create AudioRecorder, AudioPlayer, and WaveformExtractor instances.
 * 
 * This factory pattern allows for:
 * - Multiple concurrent players (up to 30)
 * - Multiple concurrent extractors
 * - Centralized lifecycle management
 * - Efficient resource cleanup
 * 
 * @example
 * ```typescript
 * import { NitroModules } from 'react-native-nitro-modules'
 * import type { AudioWaveform } from './specs/AudioWaveform.nitro'
 * 
 * const audioWaveform = NitroModules.createHybridObject<AudioWaveform>('AudioWaveform')
 * 
 * // Create a recorder
 * const recorder = audioWaveform.createRecorder()
 * 
 * // Create multiple players
 * const player1 = audioWaveform.createPlayer('player1')
 * const player2 = audioWaveform.createPlayer('player2')
 * 
 * // Create an extractor
 * const extractor = audioWaveform.createExtractor('extractor1')
 * 
 * // Clean up all players at once
 * await audioWaveform.stopAllPlayers()
 * ```
 */
export interface AudioWaveform extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
    /**
     * Create a new AudioRecorder instance
     * 
     * Creates a new recorder for capturing audio with real-time monitoring.
     * Only one recorder can be active at a time per platform limitation.
     * 
     * @returns A new AudioRecorder instance
     * 
     * @example
     * ```typescript
     * const recorder = audioWaveform.createRecorder()
     * await recorder.startRecording({ sampleRate: 44100 })
     * ```
     * 
     * @platform iOS, Android
     */
    createRecorder(): AudioRecorder

    /**
     * Create a new AudioPlayer instance with a unique key
     * 
     * Creates a new player for audio playback. Multiple players can be created
     * and used concurrently (up to 30 players). Each player must have a unique key
     * for identification and management.
     * 
     * @param key - Unique identifier for this player instance
     * @returns A new AudioPlayer instance
     * 
     * @throws Error if a player with the same key already exists
     * @throws Error if maximum number of players (30) is reached
     * 
     * @example
     * ```typescript
     * const player1 = audioWaveform.createPlayer('background-music')
     * const player2 = audioWaveform.createPlayer('sound-effect')
     * 
     * await player1.prepare({ path: '/path/to/music.mp3' })
     * await player2.prepare({ path: '/path/to/effect.wav' })
     * ```
     * 
     * @platform iOS, Android
     */
    createPlayer(key: string): AudioPlayer

    /**
     * Create a new WaveformExtractor instance with a unique key
     * 
     * Creates a new extractor for processing audio files and generating waveform data.
     * Multiple extractors can be created and used concurrently for parallel processing.
     * Each extractor must have a unique key for identification and management.
     * 
     * @param key - Unique identifier for this extractor instance
     * @returns A new WaveformExtractor instance
     * 
     * @throws Error if an extractor with the same key already exists
     * 
     * @example
     * ```typescript
     * const extractor1 = audioWaveform.createExtractor('file1')
     * const extractor2 = audioWaveform.createExtractor('file2')
     * 
     * // Process multiple files concurrently
     * const [waveform1, waveform2] = await Promise.all([
     *   extractor1.extract({ path: '/path/to/audio1.mp3', samplesPerPixel: 500 }),
     *   extractor2.extract({ path: '/path/to/audio2.mp3', samplesPerPixel: 500 })
     * ])
     * ```
     * 
     * @platform iOS, Android
     */
    createExtractor(key: string): WaveformExtractor

    /**
     * Stop and clean up all active audio players
     * 
     * This utility method stops playback on all players created by this factory
     * and releases their resources. Useful for cleanup when navigating away from
     * a screen or when the app goes to background.
     * 
     * After calling this method, the player instances remain valid but are in a
     * stopped state. They can be prepared and used again.
     * 
     * @returns Promise resolving to true if all players were stopped successfully
     * 
     * @example
     * ```typescript
     * // Clean up when component unmounts
     * useEffect(() => {
     *   return () => {
     *     audioWaveform.stopAllPlayers()
     *   }
     * }, [])
     * ```
     * 
     * @platform iOS, Android
     */
    stopAllPlayers(): Promise<boolean>

    /**
     * Cancel and clean up all active waveform extractors
     * 
     * This utility method cancels all ongoing extraction operations and releases
     * their resources. Useful for cleanup when navigating away or when extraction
     * is no longer needed.
     * 
     * All pending extract() promises will reject with a cancellation error.
     * 
     * @returns Promise resolving to true if all extractors were stopped successfully
     * 
     * @example
     * ```typescript
     * // Cancel all extractions when user navigates away
     * const handleNavigateAway = async () => {
     *   await audioWaveform.stopAllExtractors()
     *   navigation.goBack()
     * }
     * ```
     * 
     * @platform iOS, Android
     */
    stopAllExtractors(): Promise<boolean>
}
