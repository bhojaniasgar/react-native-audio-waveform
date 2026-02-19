import type { HybridObject } from 'react-native-nitro-modules'

/**
 * Duration type for audio player queries
 */
export enum DurationType {
    /**
     * Current duration (for variable bitrate files, this may change during playback)
     */
    Current = 0,
    /**
     * Maximum duration (total length of the audio file)
     */
    Max = 1
}

/**
 * Update frequency for playback position callbacks
 */
export enum UpdateFrequency {
    /**
     * Low frequency updates (~500ms intervals)
     * Suitable for basic progress bars
     */
    Low = 0,
    /**
     * Medium frequency updates (~100ms intervals)
     * Suitable for most UI updates
     */
    Medium = 1,
    /**
     * High frequency updates (~16ms intervals)
     * Suitable for smooth animations and visualizations
     */
    High = 2
}

/**
 * Configuration options for audio playback
 */
export interface PlayerConfig {
    /**
     * Path to the audio file to play
     * Can be a local file path or a remote URL
     */
    path: string

    /**
     * Initial volume level (0.0 to 1.0)
     * @default 1.0
     */
    volume?: number

    /**
     * Frequency of playback position updates
     * @default UpdateFrequency.Medium
     */
    updateFrequency?: UpdateFrequency

    /**
     * Starting position in milliseconds
     * @default 0
     */
    startPosition?: number
}

/**
 * AudioPlayer Hybrid Object
 * 
 * Provides audio playback functionality with precise control over
 * playback state, speed, and volume via direct JSI integration.
 * Supports multiple concurrent players (up to 30).
 * 
 * @example
 * ```typescript
 * const player = audioWaveform.createPlayer('player1')
 * 
 * // Prepare the player
 * await player.prepare({
 *   path: '/path/to/audio.mp3',
 *   volume: 0.8,
 *   updateFrequency: UpdateFrequency.Medium
 * })
 * 
 * // Monitor playback progress
 * player.onPlaybackUpdate((position) => {
 *   console.log('Current position:', position, 'ms')
 * })
 * 
 * // Start playback
 * await player.start(0, 1.0)
 * 
 * // Seek to position
 * await player.seekTo(30000) // 30 seconds
 * 
 * // Stop playback
 * await player.stop()
 * ```
 */
export interface AudioPlayer extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
    /**
     * Prepare the audio player with the specified configuration
     * 
     * This method loads the audio file and prepares it for playback.
     * Must be called before any playback operations.
     * 
     * @param config - Player configuration options
     * @returns Promise resolving to true if preparation was successful
     * 
     * @throws Error if the audio file cannot be found
     * @throws Error if the audio format is not supported
     * @throws Error if audio session setup fails
     * 
     * @platform iOS, Android
     */
    prepare(config: PlayerConfig): Promise<boolean>

    /**
     * Start or resume audio playback
     * 
     * @param finishMode - Playback finish mode (0 = stop at end, 1 = loop)
     * @param speed - Playback speed multiplier (0.5 = half speed, 2.0 = double speed)
     * @returns Promise resolving to true if playback started successfully
     * 
     * @throws Error if player is not prepared
     * @throws Error if audio session activation fails
     * 
     * @platform iOS, Android
     */
    start(finishMode: number, speed: number): Promise<boolean>

    /**
     * Pause the current playback
     * 
     * Playback can be resumed later with start().
     * The current position is preserved.
     * 
     * @returns Promise resolving to true if paused successfully
     * 
     * @throws Error if player is not playing
     * 
     * @platform iOS, Android
     */
    pause(): Promise<boolean>

    /**
     * Stop playback and reset to the beginning
     * 
     * After stopping, the player remains prepared and can be started again.
     * 
     * @returns Promise resolving to true if stopped successfully
     * 
     * @throws Error if player is not prepared
     * 
     * @platform iOS, Android
     */
    stop(): Promise<boolean>

    /**
     * Seek to a specific position in the audio
     * 
     * Seeking is optimized to complete in under 50ms for most files.
     * 
     * @param position - Target position in milliseconds
     * @returns Promise resolving to true if seek was successful
     * 
     * @throws Error if player is not prepared
     * @throws Error if position is out of bounds
     * 
     * @platform iOS, Android
     */
    seekTo(position: number): Promise<boolean>

    /**
     * Set the playback volume
     * 
     * @param volume - Volume level (0.0 = silent, 1.0 = maximum)
     * @returns Promise resolving to true if volume was set successfully
     * 
     * @throws Error if player is not prepared
     * @throws Error if volume is out of range
     * 
     * @platform iOS, Android
     */
    setVolume(volume: number): Promise<boolean>

    /**
     * Set the playback speed
     * 
     * Speed changes are applied smoothly without audio glitches.
     * 
     * @param speed - Speed multiplier (0.5 to 2.0 recommended)
     * @returns Promise resolving to true if speed was set successfully
     * 
     * @throws Error if player is not prepared
     * @throws Error if speed is out of supported range
     * 
     * @platform iOS, Android
     */
    setPlaybackSpeed(speed: number): Promise<boolean>

    /**
     * Get the duration of the audio file
     * 
     * @param type - Duration type (Current or Max)
     * @returns Promise resolving to the duration in milliseconds
     * 
     * @throws Error if player is not prepared
     * 
     * @platform iOS, Android
     */
    getDuration(type: DurationType): Promise<number>

    /**
     * Get the current playback position
     * 
     * @returns Promise resolving to the current position in milliseconds
     * 
     * @throws Error if player is not prepared
     * 
     * @platform iOS, Android
     */
    getCurrentPosition(): Promise<number>

    /**
     * Check if the player is currently playing
     * 
     * @returns true if audio is currently playing, false otherwise
     * 
     * @platform iOS, Android
     */
    isPlaying(): boolean

    /**
     * Register a callback for playback position updates
     * 
     * The callback will be invoked at the frequency specified in PlayerConfig.
     * This uses direct JSI callbacks for minimal latency.
     * 
     * @param callback - Function to be called with position updates (in milliseconds)
     * 
     * @example
     * ```typescript
     * player.onPlaybackUpdate((position) => {
     *   // Update progress bar
     *   setProgress(position / duration)
     * })
     * ```
     * 
     * @platform iOS, Android
     */
    onPlaybackUpdate(callback: (position: number) => void): void

    /**
     * Register a callback for playback completion
     * 
     * The callback will be invoked when playback reaches the end of the audio file
     * (unless in loop mode).
     * 
     * @param callback - Function to be called when playback finishes
     * 
     * @example
     * ```typescript
     * player.onPlaybackFinished(() => {
     *   console.log('Playback completed')
     *   // Clean up or start next track
     * })
     * ```
     * 
     * @platform iOS, Android
     */
    onPlaybackFinished(callback: () => void): void
}
