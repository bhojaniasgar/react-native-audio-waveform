package com.audiowaveform

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.margelo.nitro.audiowaveform.AudioRecorderBase
import com.margelo.nitro.audiowaveform.RecordingConfig
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.log10
import kotlin.math.pow

/**
 * Error types for AudioRecorder operations
 */
sealed class AudioRecorderError(message: String) : Exception(message) {
    class PermissionDenied : AudioRecorderError("Audio recording permission denied. Please grant permission in Settings.")
    class MediaRecorderSetupFailed(details: String) : AudioRecorderError("Failed to configure MediaRecorder: $details")
    class FileSystemError(details: String) : AudioRecorderError("File system error: $details")
    class RecordingFailed(details: String) : AudioRecorderError("Recording failed: $details")
    class NoActiveRecording : AudioRecorderError("No active recording session")
    class InvalidConfiguration(details: String) : AudioRecorderError("Invalid recording configuration: $details")
}

/**
 * Kotlin implementation of AudioRecorder for Nitro Modules
 * 
 * This class inherits from AudioRecorderBase (C++) and provides
 * Android-specific implementation using MediaRecorder.
 * 
 * Key features:
 * - Direct JSI integration for real-time decibel callbacks
 * - Thread-safe callback management via C++ base class
 * - MediaRecorder configuration for recording
 * - Permission handling for Android
 * - Comprehensive error handling for all edge cases
 */
class AudioRecorderKotlin(private val context: Context) : AudioRecorderBase() {
    
    companion object {
        private const val TAG = "AudioRecorderKotlin"
        private const val RECORD_AUDIO_PERMISSION = Manifest.permission.RECORD_AUDIO
    }
    
    // MARK: - Properties
    
    /** MediaRecorder instance for recording */
    private var mediaRecorder: MediaRecorder? = null
    
    /** Handler for real-time decibel monitoring */
    private var meteringHandler: Handler? = null
    
    /** Runnable for periodic decibel updates */
    private var meteringRunnable: Runnable? = null
    
    /** Current recording file path */
    private var audioFilePath: String? = null
    
    /** Whether to use legacy normalization for decibel values */
    private var useLegacyNormalization: Boolean = false
    
    /** Update frequency for decibel monitoring in milliseconds (default: 500ms) */
    private var updateFrequency: Long = 500L
    
    // MARK: - Initialization
    
    init {
        meteringHandler = Handler(Looper.getMainLooper())
    }
    
    // MARK: - Permission Methods
    
    /**
     * Check if audio recording permission is granted
     * 
     * @return Promise resolving to "granted", "denied", or "undetermined"
     */
    override fun checkHasPermission(): Promise<String> {
        return Promise.resolve {
            when (ContextCompat.checkSelfPermission(context, RECORD_AUDIO_PERMISSION)) {
                PackageManager.PERMISSION_GRANTED -> "granted"
                else -> "denied"
            }
        }
    }
    
    /**
     * Request audio recording permission from user
     * 
     * Note: On Android, permission requests must be initiated from an Activity.
     * This method returns the current permission status. The app should handle
     * the actual permission request through the Activity.
     * 
     * @return Promise resolving to permission status
     */
    override fun getPermission(): Promise<String> {
        return Promise.resolve {
            // On Android, we can't directly request permissions from a service/module
            // The Activity must handle the permission request
            // We return the current status
            when (ContextCompat.checkSelfPermission(context, RECORD_AUDIO_PERMISSION)) {
                PackageManager.PERMISSION_GRANTED -> "granted"
                else -> "denied"
            }
        }
    }
    
    // MARK: - Recording Control Methods
    
    /**
     * Start audio recording with given configuration
     * 
     * @param config RecordingConfig struct containing recording parameters
     * @return Promise resolving to true if recording started successfully
     */
    override fun startRecording(config: RecordingConfig): Promise<Boolean> {
        return Promise.resolve {
            // Check permission first
            if (ContextCompat.checkSelfPermission(context, RECORD_AUDIO_PERMISSION) 
                != PackageManager.PERMISSION_GRANTED) {
                throw AudioRecorderError.PermissionDenied()
            }
            
            // Store legacy normalization preference
            useLegacyNormalization = config.useLegacyNormalization ?: false
            
            // Determine file path
            audioFilePath = if (config.path != null && config.path.isNotEmpty()) {
                validateFilePath(config.path)
                config.path
            } else {
                createAudioRecordPath(config.fileNameFormat)
            }
            
            // Validate configuration
            validateRecordingConfig(config)
            
            // Create and configure MediaRecorder
            try {
                mediaRecorder = createMediaRecorder().apply {
                    // Set audio source
                    setAudioSource(MediaRecorder.AudioSource.MIC)
                    
                    // Set output format
                    val outputFormat = getOutputFormat(config.encoder ?: Constants.acc)
                    setOutputFormat(outputFormat)
                    
                    // Set audio encoder
                    val audioEncoder = getAudioEncoder(config.encoder ?: Constants.acc)
                    setAudioEncoder(audioEncoder)
                    
                    // Set sample rate
                    val sampleRate = config.sampleRate ?: 44100
                    setAudioSamplingRate(sampleRate)
                    
                    // Set bit rate
                    val bitRate = config.bitRate ?: 128000
                    setAudioEncodingBitRate(bitRate)
                    
                    // Set output file
                    setOutputFile(audioFilePath)
                    
                    // Prepare recorder
                    try {
                        prepare()
                    } catch (e: IOException) {
                        throw AudioRecorderError.MediaRecorderSetupFailed(
                            "Failed to prepare recorder: ${e.message}"
                        )
                    } catch (e: IllegalStateException) {
                        throw AudioRecorderError.MediaRecorderSetupFailed(
                            "Invalid recorder state: ${e.message}"
                        )
                    }
                    
                    // Start recording
                    try {
                        start()
                    } catch (e: IllegalStateException) {
                        throw AudioRecorderError.RecordingFailed(
                            "Failed to start recording: ${e.message}"
                        )
                    } catch (e: RuntimeException) {
                        throw AudioRecorderError.RecordingFailed(
                            "Recording failed. Check microphone availability: ${e.message}"
                        )
                    }
                }
                
                // Update state
                isRecording_.store(true)
                isPaused_.store(false)
                startListening()
                
                true
            } catch (e: AudioRecorderError) {
                // Clean up on error
                releaseMediaRecorder()
                throw e
            } catch (e: Exception) {
                // Clean up on error
                releaseMediaRecorder()
                throw AudioRecorderError.RecordingFailed(
                    "Unexpected error: ${e.message}"
                )
            }
        }
    }
    
    /**
     * Stop current recording and finalize audio file
     * 
     * @return Promise resolving to file path of recorded audio
     */
    override fun stopRecording(): Promise<String> {
        return Promise.resolve {
            val recorder = mediaRecorder 
                ?: throw AudioRecorderError.NoActiveRecording()
            
            stopListening()
            
            try {
                recorder.stop()
            } catch (e: IllegalStateException) {
                // Recording was not started or already stopped
                Log.w(TAG, "MediaRecorder stop failed: ${e.message}")
            } catch (e: RuntimeException) {
                // Stop failed for other reasons
                Log.w(TAG, "MediaRecorder stop error: ${e.message}")
            } finally {
                releaseMediaRecorder()
                isRecording_.store(false)
                isPaused_.store(false)
            }
            
            val filePath = audioFilePath 
                ?: throw AudioRecorderError.FileSystemError("No recording file path available")
            
            // Verify file was created and is accessible
            val file = File(filePath)
            if (!file.exists()) {
                throw AudioRecorderError.FileSystemError("Recording file was not created")
            }
            
            // Verify file has content
            if (file.length() == 0L) {
                throw AudioRecorderError.FileSystemError("Recording file is empty")
            }
            
            filePath
        }
    }
    
    /**
     * Pause current recording
     * 
     * @return Promise resolving to true if paused successfully
     */
    override fun pauseRecording(): Promise<Boolean> {
        return Promise.resolve {
            val recorder = mediaRecorder 
                ?: throw AudioRecorderError.NoActiveRecording()
            
            if (!isRecording_.load()) {
                throw AudioRecorderError.RecordingFailed("Recording is not active")
            }
            
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    recorder.pause()
                    isPaused_.store(true)
                    true
                } else {
                    throw AudioRecorderError.RecordingFailed(
                        "Pause/Resume requires Android N (API 24) or higher"
                    )
                }
            } catch (e: IllegalStateException) {
                throw AudioRecorderError.RecordingFailed(
                    "Failed to pause recording: ${e.message}"
                )
            }
        }
    }
    
    /**
     * Resume paused recording
     * 
     * @return Promise resolving to true if resumed successfully
     */
    override fun resumeRecording(): Promise<Boolean> {
        return Promise.resolve {
            val recorder = mediaRecorder 
                ?: throw AudioRecorderError.NoActiveRecording()
            
            if (!isPaused_.load()) {
                throw AudioRecorderError.RecordingFailed("Recording is not paused")
            }
            
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    recorder.resume()
                    isPaused_.store(false)
                    true
                } else {
                    throw AudioRecorderError.RecordingFailed(
                        "Pause/Resume requires Android N (API 24) or higher"
                    )
                }
            } catch (e: IllegalStateException) {
                throw AudioRecorderError.RecordingFailed(
                    "Failed to resume recording: ${e.message}"
                )
            }
        }
    }
    
    // MARK: - Real-time Monitoring
    
    /**
     * Get current decibel level snapshot
     * 
     * @return Promise resolving to current decibel level
     */
    override fun getDecibel(): Promise<Double> {
        return Promise.resolve {
            val recorder = mediaRecorder 
                ?: throw AudioRecorderError.NoActiveRecording()
            
            if (!isRecording_.load()) {
                throw AudioRecorderError.RecordingFailed("Recording is not active")
            }
            
            getDecibelLevel().toDouble()
        }
    }
    
    /**
     * Register callback for real-time decibel updates
     * 
     * @param callback Function to invoke with decibel updates
     */
    override fun onDecibelUpdate(callback: (Double) -> Unit) {
        setDecibelCallback(callback)
    }
    
    // MARK: - Private Helper Methods
    
    /**
     * Create a MediaRecorder instance based on Android version
     * 
     * @return MediaRecorder instance
     */
    private fun createMediaRecorder(): MediaRecorder {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }
    }
    
    /**
     * Release MediaRecorder resources
     */
    private fun releaseMediaRecorder() {
        mediaRecorder?.apply {
            try {
                reset()
                release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing MediaRecorder: ${e.message}")
            }
        }
        mediaRecorder = null
    }
    
    /**
     * Create a file path for audio recording
     * 
     * @param fileNameFormat Optional date format string for filename
     * @return File path for the recording
     */
    private fun createAudioRecordPath(fileNameFormat: String?): String {
        val format = SimpleDateFormat(
            fileNameFormat ?: "yyyy-MM-dd-HH-mm-ss-SSS",
            Locale.getDefault()
        )
        val currentFileName = "${format.format(Date())}.m4a"
        
        val directory = context.getExternalFilesDir(null) 
            ?: context.filesDir
        
        // Ensure directory exists
        if (!directory.exists()) {
            if (!directory.mkdirs()) {
                throw AudioRecorderError.FileSystemError(
                    "Failed to create recording directory"
                )
            }
        }
        
        return File(directory, currentFileName).absolutePath
    }
    
    /**
     * Validate file path for recording
     * 
     * @param path File path to validate
     * @throws AudioRecorderError if path is invalid
     */
    private fun validateFilePath(path: String) {
        if (path.isEmpty()) {
            throw AudioRecorderError.FileSystemError("File path cannot be empty")
        }
        
        val file = File(path)
        val directory = file.parentFile
        
        // Check if directory exists or can be created
        if (directory != null && !directory.exists()) {
            if (!directory.mkdirs()) {
                throw AudioRecorderError.FileSystemError(
                    "Cannot create directory: ${directory.absolutePath}"
                )
            }
        }
        
        // Check if file already exists
        if (file.exists()) {
            // Try to delete existing file
            if (!file.delete()) {
                throw AudioRecorderError.FileSystemError(
                    "Cannot overwrite existing file: ${file.absolutePath}"
                )
            }
        }
        
        // Check write permission by creating and deleting a test file
        try {
            file.createNewFile()
            file.delete()
        } catch (e: IOException) {
            throw AudioRecorderError.FileSystemError(
                "No write permission for path: ${e.message}"
            )
        }
    }
    
    /**
     * Validate recording configuration
     * 
     * @param config Recording configuration to validate
     * @throws AudioRecorderError if configuration is invalid
     */
    private fun validateRecordingConfig(config: RecordingConfig) {
        // Validate sample rate
        config.sampleRate?.let { sampleRate ->
            if (sampleRate <= 0 || sampleRate > 192000) {
                throw AudioRecorderError.InvalidConfiguration(
                    "Sample rate must be between 1 and 192000 Hz, got $sampleRate"
                )
            }
        }
        
        // Validate bit rate
        config.bitRate?.let { bitRate ->
            if (bitRate <= 0 || bitRate > 320000) {
                throw AudioRecorderError.InvalidConfiguration(
                    "Bit rate must be between 1 and 320000 bps, got $bitRate"
                )
            }
        }
        
        // Validate encoder
        config.encoder?.let { encoder ->
            val validEncoders = listOf(
                Constants.acc,
                Constants.aac_eld,
                Constants.he_aac,
                Constants.amr_nb,
                Constants.amr_wb,
                Constants.opus,
                Constants.vorbis
            )
            
            if (encoder !in validEncoders) {
                throw AudioRecorderError.InvalidConfiguration(
                    "Invalid encoder format: $encoder"
                )
            }
        }
    }
    
    /**
     * Get output format for MediaRecorder based on encoder
     * 
     * @param encoder Encoder constant from config
     * @return MediaRecorder output format
     */
    private fun getOutputFormat(encoder: Int): Int {
        return when (encoder) {
            Constants.acc, Constants.aac_eld, Constants.he_aac -> MediaRecorder.OutputFormat.MPEG_4
            Constants.amr_nb, Constants.amr_wb -> MediaRecorder.OutputFormat.THREE_GPP
            Constants.opus, Constants.vorbis -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    MediaRecorder.OutputFormat.OGG
                } else {
                    MediaRecorder.OutputFormat.MPEG_4
                }
            }
            else -> MediaRecorder.OutputFormat.MPEG_4
        }
    }
    
    /**
     * Get audio encoder for MediaRecorder based on encoder constant
     * 
     * @param encoder Encoder constant from config
     * @return MediaRecorder audio encoder
     */
    private fun getAudioEncoder(encoder: Int): Int {
        return when (encoder) {
            Constants.acc -> MediaRecorder.AudioEncoder.AAC
            Constants.aac_eld -> MediaRecorder.AudioEncoder.AAC_ELD
            Constants.he_aac -> MediaRecorder.AudioEncoder.HE_AAC
            Constants.amr_nb -> MediaRecorder.AudioEncoder.AMR_NB
            Constants.amr_wb -> MediaRecorder.AudioEncoder.AMR_WB
            Constants.opus -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    MediaRecorder.AudioEncoder.OPUS
                } else {
                    MediaRecorder.AudioEncoder.AAC
                }
            }
            Constants.vorbis -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    MediaRecorder.AudioEncoder.VORBIS
                } else {
                    MediaRecorder.AudioEncoder.AAC
                }
            }
            else -> MediaRecorder.AudioEncoder.AAC
        }
    }
    
    /**
     * Get current decibel level from MediaRecorder
     * 
     * @return Current decibel level as Float
     */
    private fun getDecibelLevel(): Float {
        val recorder = mediaRecorder ?: return -160f
        
        return try {
            val maxAmplitude = recorder.maxAmplitude
            
            if (useLegacyNormalization) {
                // Legacy mode: convert amplitude to dB
                if (maxAmplitude > 0) {
                    20 * log10(maxAmplitude.toFloat() / 32767f)
                } else {
                    -160f
                }
            } else {
                // New mode: return linear scale (0.0 to 1.0)
                maxAmplitude.toFloat() / 32767f
            }
        } catch (e: IllegalStateException) {
            Log.w(TAG, "Failed to get max amplitude: ${e.message}")
            -160f
        }
    }
    
    /**
     * Start listening for decibel updates
     * Sets up a handler to periodically check and report decibel levels
     */
    private fun startListening() {
        stopListening()
        
        meteringRunnable = object : Runnable {
            override fun run() {
                if (isRecording_.load() && !isPaused_.load()) {
                    val decibel = getDecibelLevel()
                    
                    // Invoke C++ callback (thread-safe)
                    invokeDecibelCallback(decibel.toDouble())
                    
                    // Schedule next update
                    meteringHandler?.postDelayed(this, updateFrequency)
                }
            }
        }
        
        meteringHandler?.post(meteringRunnable!!)
    }
    
    /**
     * Stop listening for decibel updates
     * Removes callbacks from the handler
     */
    private fun stopListening() {
        meteringRunnable?.let { runnable ->
            meteringHandler?.removeCallbacks(runnable)
        }
        meteringRunnable = null
    }
    
    /**
     * Clean up resources when object is destroyed
     */
    protected fun finalize() {
        stopListening()
        releaseMediaRecorder()
    }
}
