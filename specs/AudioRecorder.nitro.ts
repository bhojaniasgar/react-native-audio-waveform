import { HybridObject } from 'react-native-nitro-modules'

/**
 * Configuration options for audio recording
 */
export interface RecordingConfig {
    /**
     * Custom file path for the recording.
     * If not provided, a default path will be used.
     */
    path?: string

    /**
     * Audio encoder format.
     * Platform-specific values (e.g., AAC, MP3, etc.)
     */
    encoder?: number

    /**
     * Sample rate in Hz (e.g., 44100, 48000)
     * @default 44100
     */
    sampleRate?: number

    /**
     * Bit rate in bits per second
     * @default 128000
     */
    bitRate?: number

    /**
     * Format string for generating file names
     * Supports date/time placeholders
     */
    fileNameFormat?: string

    /**
     * Whether to use legacy normalization algorithm
     * @default false
     */
    useLegacyNormalization?: boolean
}

/**
 * AudioRecorder Hybrid Object
 * 
 * Provides audio recording functionality with real-time monitoring
 * via direct JSI integration for optimal performance.
 * 
 * @example
 * ```typescript
 * const recorder = audioWaveform.createRecorder()
 * 
 * // Check permission
 * const permission = await recorder.checkHasPermission()
 * if (permission !== 'granted') {
 *   await recorder.getPermission()
 * }
 * 
 * // Start recording
 * await recorder.startRecording({
 *   sampleRate: 44100,
 *   bitRate: 128000
 * })
 * 
 * // Monitor decibel levels
 * recorder.onDecibelUpdate((decibel) => {
 *   console.log('Current level:', decibel)
 * })
 * 
 * // Stop recording
 * const filePath = await recorder.stopRecording()
 * ```
 */
export interface AudioRecorder extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
    /**
     * Check if the app has audio recording permission
     * 
     * @returns Promise resolving to permission status:
     *   - 'granted': Permission is granted
     *   - 'denied': Permission is denied
     *   - 'undetermined': Permission has not been requested yet
     * 
     * @platform iOS, Android
     */
    checkHasPermission(): Promise<string>

    /**
     * Request audio recording permission from the user
     * 
     * On iOS, this will show the system permission dialog.
     * On Android, this will request RECORD_AUDIO permission.
     * 
     * @returns Promise resolving to permission status after request
     * 
     * @platform iOS, Android
     */
    getPermission(): Promise<string>

    /**
     * Start audio recording with the specified configuration
     * 
     * @param config - Recording configuration options
     * @returns Promise resolving to true if recording started successfully
     * 
     * @throws Error if permission is not granted
     * @throws Error if another recording is already in progress
     * @throws Error if audio session setup fails
     * 
     * @platform iOS, Android
     */
    startRecording(config: RecordingConfig): Promise<boolean>

    /**
     * Stop the current recording and finalize the audio file
     * 
     * @returns Promise resolving to the file path of the recorded audio
     * 
     * @throws Error if no recording is in progress
     * @throws Error if file finalization fails
     * 
     * @platform iOS, Android
     */
    stopRecording(): Promise<string>

    /**
     * Pause the current recording
     * 
     * Recording can be resumed later with resumeRecording().
     * 
     * @returns Promise resolving to true if paused successfully
     * 
     * @throws Error if no recording is in progress
     * @throws Error if recording is already paused
     * 
     * @platform iOS, Android
     */
    pauseRecording(): Promise<boolean>

    /**
     * Resume a paused recording
     * 
     * @returns Promise resolving to true if resumed successfully
     * 
     * @throws Error if no recording is paused
     * 
     * @platform iOS, Android
     */
    resumeRecording(): Promise<boolean>

    /**
     * Get the current decibel level of the recording
     * 
     * This method provides a snapshot of the current audio level.
     * For continuous monitoring, use onDecibelUpdate() instead.
     * 
     * @returns Promise resolving to the current decibel level (typically -160 to 0 dB)
     * 
     * @throws Error if no recording is in progress
     * 
     * @platform iOS, Android
     */
    getDecibel(): Promise<number>

    /**
     * Register a callback for real-time decibel level updates
     * 
     * The callback will be invoked continuously during recording with
     * the current decibel level. This uses direct JSI callbacks for
     * minimal latency (< 50ms).
     * 
     * @param callback - Function to be called with decibel updates
     * 
     * @example
     * ```typescript
     * recorder.onDecibelUpdate((decibel) => {
     *   // Update UI with current level
     *   setDecibelLevel(decibel)
     * })
     * ```
     * 
     * @platform iOS, Android
     */
    onDecibelUpdate(callback: (decibel: number) => void): void
}
