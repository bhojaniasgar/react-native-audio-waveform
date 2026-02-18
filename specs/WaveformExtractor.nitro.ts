import { HybridObject } from 'react-native-nitro-modules'

/**
 * Configuration options for waveform extraction
 */
export interface ExtractionConfig {
    /**
     * Path to the audio file to extract waveform from
     * Can be a local file path or a remote URL
     */
    path: string

    /**
     * Number of audio samples to process per pixel
     * Higher values result in lower resolution but faster extraction
     * 
     * @example
     * - 100: High resolution, slower extraction
     * - 500: Medium resolution, balanced performance
     * - 1000: Low resolution, faster extraction
     * 
     * @default 500
     */
    samplesPerPixel: number

    /**
     * Whether to normalize the waveform data
     * Normalization scales the waveform to use the full amplitude range
     * 
     * @default true
     */
    normalize?: boolean

    /**
     * Scale factor for the normalized waveform
     * Only applies when normalize is true
     * 
     * @default 1.0
     */
    scale?: number

    /**
     * Amplitude threshold below which samples are set to zero
     * Useful for removing background noise from visualization
     * Value range: 0.0 to 1.0
     * 
     * @default 0.0
     */
    threshold?: number
}

/**
 * WaveformExtractor Hybrid Object
 * 
 * Provides high-performance waveform extraction from audio files.
 * Extraction logic is implemented in C++ for cross-platform optimization,
 * achieving at least 3x faster extraction compared to traditional bridge-based approaches.
 * 
 * Supports progress monitoring and cancellation for large files.
 * Can handle audio files up to 1 hour duration without memory issues.
 * 
 * @example
 * ```typescript
 * const extractor = audioWaveform.createExtractor('extractor1')
 * 
 * // Monitor extraction progress
 * extractor.onProgress((progress) => {
 *   console.log('Extraction progress:', Math.round(progress * 100), '%')
 * })
 * 
 * // Extract waveform
 * const waveform = await extractor.extract({
 *   path: '/path/to/audio.mp3',
 *   samplesPerPixel: 500,
 *   normalize: true,
 *   scale: 1.0,
 *   threshold: 0.05
 * })
 * 
 * // waveform is a 2D array: [channel][sample]
 * // For stereo: waveform[0] = left channel, waveform[1] = right channel
 * console.log('Extracted', waveform[0].length, 'samples per channel')
 * ```
 */
export interface WaveformExtractor extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
    /**
     * Extract waveform data from an audio file
     * 
     * This method decodes the audio file and processes it to generate
     * waveform visualization data. The extraction is performed in C++ for
     * optimal performance, with parallel processing on multi-core CPUs.
     * 
     * The returned data is a 2D array where:
     * - First dimension represents audio channels (0 = left, 1 = right for stereo)
     * - Second dimension represents amplitude samples for visualization
     * 
     * @param config - Extraction configuration options
     * @returns Promise resolving to a 2D array of waveform data [channel][sample]
     * 
     * @throws Error if the audio file cannot be found
     * @throws Error if the audio format is not supported
     * @throws Error if decoding fails
     * @throws Error if extraction is cancelled
     * @throws Error if memory allocation fails
     * 
     * @platform iOS, Android
     */
    extract(config: ExtractionConfig): Promise<number[][]>

    /**
     * Cancel an ongoing extraction operation
     * 
     * This method safely cancels the extraction process and cleans up resources.
     * The extract() promise will reject with a cancellation error.
     * 
     * Cancellation is thread-safe and can be called at any time during extraction.
     * 
     * @platform iOS, Android
     */
    cancel(): void

    /**
     * Register a callback for extraction progress updates
     * 
     * The callback will be invoked periodically during extraction with a progress
     * value between 0.0 (started) and 1.0 (completed).
     * 
     * This uses direct JSI callbacks for minimal latency.
     * 
     * @param callback - Function to be called with progress updates (0.0 to 1.0)
     * 
     * @example
     * ```typescript
     * extractor.onProgress((progress) => {
     *   setExtractionProgress(progress * 100)
     * })
     * ```
     * 
     * @platform iOS, Android
     */
    onProgress(callback: (progress: number) => void): void

    /**
     * Get the current extraction progress
     * 
     * Returns a value between 0.0 (not started or just started) and 1.0 (completed).
     * 
     * @returns Current progress value (0.0 to 1.0)
     * 
     * @platform iOS, Android
     */
    getProgress(): number
}
