package com.audiowaveform

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.util.Log
import com.margelo.nitro.audiowaveform.WaveformExtractorBase
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Error types for WaveformExtractor operations
 */
sealed class WaveformExtractorError(message: String) : Exception(message) {
    class FileNotFound(path: String) : WaveformExtractorError("Audio file not found: $path")
    class InvalidAudioFile(details: String) : WaveformExtractorError("Invalid audio file: $details")
    class DecodingFailed(details: String) : WaveformExtractorError("Audio decoding failed: $details")
    class ExtractorSetupFailed(details: String) : WaveformExtractorError("Failed to set up MediaExtractor: $details")
    class CodecSetupFailed(details: String) : WaveformExtractorError("Failed to set up MediaCodec: $details")
    class UnsupportedFormat(details: String) : WaveformExtractorError("Unsupported audio format: $details")
}

/**
 * Kotlin implementation of WaveformExtractor for Nitro Modules
 * 
 * This class inherits from WaveformExtractorBase (C++) and provides
 * Android-specific implementation for audio decoding using MediaExtractor and MediaCodec.
 * 
 * Key features:
 * - MediaExtractor for reading audio file metadata and tracks
 * - MediaCodec for efficient hardware-accelerated audio decoding
 * - Support for various audio formats (M4A, MP3, WAV, AAC, etc.)
 * - Direct integration with C++ waveform processing
 * - Thread-safe progress tracking via C++ base class
 * - Cancellation support for long-running extractions
 * 
 * Architecture:
 * - Kotlin layer: Audio decoding (this class)
 * - C++ layer: Waveform processing and normalization (WaveformExtractorBase)
 * - JavaScript layer: API calls via JSI
 */
class WaveformExtractorKotlin(private val context: Context) : WaveformExtractorBase() {
    
    companion object {
        private const val TAG = "WaveformExtractorKotlin"
        private const val TIMEOUT_US = 10000L // 10ms timeout for codec operations
    }
    
    // MARK: - Properties
    
    /** MediaExtractor instance for reading audio file */
    private var mediaExtractor: MediaExtractor? = null
    
    /** MediaCodec instance for decoding audio */
    private var mediaCodec: MediaCodec? = null
    
    // MARK: - Initialization
    
    init {
        // No initialization needed
    }
    
    // MARK: - Audio Decoding Implementation
    
    /**
     * Decode audio file to raw PCM samples
     * 
     * This method is called by the C++ base class during extraction.
     * It uses MediaExtractor and MediaCodec to decode the audio file into raw PCM samples.
     * 
     * @param path File path to the audio file
     * @returns List of interleaved audio samples (normalized to -1.0 to 1.0)
     * @throws Exception if decoding fails
     */
    override fun decodeAudioData(path: String): List<Float> {
        // Validate file path
        if (path.isEmpty()) {
            throw WaveformExtractorError.InvalidAudioFile("File path cannot be empty")
        }
        
        // Check if file exists
        val file = File(path)
        if (!file.exists()) {
            throw WaveformExtractorError.FileNotFound(path)
        }
        
        // Check if extraction was cancelled before starting
        if (isCancelled()) {
            throw WaveformExtractorError.DecodingFailed("Decoding cancelled by user")
        }
        
        try {
            // Set up MediaExtractor
            mediaExtractor = MediaExtractor().apply {
                try {
                    setDataSource(path)
                } catch (e: Exception) {
                    throw WaveformExtractorError.ExtractorSetupFailed(
                        "Failed to set data source: ${e.message}"
                    )
                }
            }
            
            val extractor = mediaExtractor 
                ?: throw WaveformExtractorError.ExtractorSetupFailed("MediaExtractor is null")
            
            // Find audio track
            val audioTrackIndex = findAudioTrack(extractor)
            if (audioTrackIndex < 0) {
                throw WaveformExtractorError.InvalidAudioFile("No audio track found in file")
            }
            
            // Select audio track
            extractor.selectTrack(audioTrackIndex)
            
            // Get audio format
            val format = extractor.getTrackFormat(audioTrackIndex)
            val mimeType = format.getString(MediaFormat.KEY_MIME)
                ?: throw WaveformExtractorError.UnsupportedFormat("Cannot determine audio format")
            
            Log.d(TAG, "Decoding audio: mime=$mimeType, format=$format")
            
            // Set up MediaCodec
            mediaCodec = try {
                MediaCodec.createDecoderByType(mimeType)
            } catch (e: Exception) {
                throw WaveformExtractorError.CodecSetupFailed(
                    "Failed to create decoder for $mimeType: ${e.message}"
                )
            }
            
            val codec = mediaCodec 
                ?: throw WaveformExtractorError.CodecSetupFailed("MediaCodec is null")
            
            // Configure codec
            try {
                codec.configure(format, null, null, 0)
                codec.start()
            } catch (e: Exception) {
                throw WaveformExtractorError.CodecSetupFailed(
                    "Failed to configure/start codec: ${e.message}"
                )
            }
            
            // Decode audio data
            val audioSamples = decodeAudioSamples(extractor, codec)
            
            // Cleanup
            cleanup()
            
            // Validate we got some data
            if (audioSamples.isEmpty()) {
                throw WaveformExtractorError.DecodingFailed("No audio samples decoded from file")
            }
            
            Log.d(TAG, "Successfully decoded ${audioSamples.size} audio samples")
            
            return audioSamples
            
        } catch (e: WaveformExtractorError) {
            cleanup()
            throw e
        } catch (e: Exception) {
            cleanup()
            throw WaveformExtractorError.DecodingFailed(
                "Unexpected error during decoding: ${e.message}"
            )
        }
    }
    
    // MARK: - Private Helper Methods
    
    /**
     * Find the audio track index in the MediaExtractor
     * 
     * @param extractor MediaExtractor instance
     * @return Audio track index, or -1 if not found
     */
    private fun findAudioTrack(extractor: MediaExtractor): Int {
        val trackCount = extractor.trackCount
        
        for (i in 0 until trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)
            
            if (mime != null && mime.startsWith("audio/")) {
                return i
            }
        }
        
        return -1
    }
    
    /**
     * Decode audio samples from the extractor using the codec
     * 
     * @param extractor MediaExtractor instance
     * @param codec MediaCodec instance
     * @return List of decoded audio samples (normalized to -1.0 to 1.0)
     */
    private fun decodeAudioSamples(
        extractor: MediaExtractor,
        codec: MediaCodec
    ): List<Float> {
        val audioSamples = mutableListOf<Float>()
        val bufferInfo = MediaCodec.BufferInfo()
        var isInputDone = false
        var isOutputDone = false
        
        while (!isOutputDone) {
            // Check for cancellation
            if (isCancelled()) {
                Log.d(TAG, "Decoding cancelled by user")
                break
            }
            
            // Feed input to codec
            if (!isInputDone) {
                val inputBufferIndex = codec.dequeueInputBuffer(TIMEOUT_US)
                
                if (inputBufferIndex >= 0) {
                    val inputBuffer = codec.getInputBuffer(inputBufferIndex)
                    
                    if (inputBuffer != null) {
                        // Read sample data from extractor
                        val sampleSize = extractor.readSampleData(inputBuffer, 0)
                        
                        if (sampleSize < 0) {
                            // End of stream
                            codec.queueInputBuffer(
                                inputBufferIndex,
                                0,
                                0,
                                0,
                                MediaCodec.BUFFER_FLAG_END_OF_STREAM
                            )
                            isInputDone = true
                        } else {
                            // Queue input buffer with sample data
                            val presentationTimeUs = extractor.sampleTime
                            codec.queueInputBuffer(
                                inputBufferIndex,
                                0,
                                sampleSize,
                                presentationTimeUs,
                                0
                            )
                            
                            // Advance to next sample
                            extractor.advance()
                        }
                    }
                }
            }
            
            // Get output from codec
            val outputBufferIndex = codec.dequeueOutputBuffer(bufferInfo, TIMEOUT_US)
            
            when {
                outputBufferIndex >= 0 -> {
                    // We have decoded data
                    val outputBuffer = codec.getOutputBuffer(outputBufferIndex)
                    
                    if (outputBuffer != null && bufferInfo.size > 0) {
                        // Extract PCM samples from output buffer
                        val samples = extractPCMSamples(outputBuffer, bufferInfo)
                        audioSamples.addAll(samples)
                    }
                    
                    // Release output buffer
                    codec.releaseOutputBuffer(outputBufferIndex, false)
                    
                    // Check for end of stream
                    if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                        isOutputDone = true
                    }
                }
                
                outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                    // Output format changed (this is expected)
                    val newFormat = codec.outputFormat
                    Log.d(TAG, "Output format changed: $newFormat")
                }
                
                outputBufferIndex == MediaCodec.INFO_TRY_AGAIN_LATER -> {
                    // No output available yet, continue
                }
                
                outputBufferIndex == MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED -> {
                    // Output buffers changed (deprecated, but handle it)
                    Log.d(TAG, "Output buffers changed")
                }
            }
        }
        
        return audioSamples
    }
    
    /**
     * Extract PCM samples from a codec output buffer
     * 
     * MediaCodec outputs PCM data in 16-bit signed integer format.
     * We need to convert this to normalized float values (-1.0 to 1.0).
     * 
     * @param buffer ByteBuffer containing PCM data
     * @param bufferInfo Buffer info with size and offset
     * @return List of normalized float samples
     */
    private fun extractPCMSamples(
        buffer: ByteBuffer,
        bufferInfo: MediaCodec.BufferInfo
    ): List<Float> {
        val samples = mutableListOf<Float>()
        
        // Set buffer position and limit
        buffer.position(bufferInfo.offset)
        buffer.limit(bufferInfo.offset + bufferInfo.size)
        
        // Ensure little-endian byte order
        buffer.order(ByteOrder.LITTLE_ENDIAN)
        
        // MediaCodec typically outputs 16-bit PCM
        // Each sample is 2 bytes (short)
        val numSamples = bufferInfo.size / 2
        
        for (i in 0 until numSamples) {
            if (buffer.remaining() >= 2) {
                // Read 16-bit sample
                val sample = buffer.short
                
                // Normalize to -1.0 to 1.0
                // Short range: -32768 to 32767
                val normalizedSample = sample.toFloat() / 32768.0f
                
                samples.add(normalizedSample)
            }
        }
        
        return samples
    }
    
    /**
     * Clean up resources
     */
    private fun cleanup() {
        mediaCodec?.apply {
            try {
                stop()
                release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing MediaCodec: ${e.message}")
            }
        }
        mediaCodec = null
        
        mediaExtractor?.apply {
            try {
                release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing MediaExtractor: ${e.message}")
            }
        }
        mediaExtractor = null
    }
    
    /**
     * Clean up resources when object is destroyed
     */
    protected fun finalize() {
        cleanup()
    }
}
