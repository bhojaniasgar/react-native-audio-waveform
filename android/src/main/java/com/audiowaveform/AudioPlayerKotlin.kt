package com.audiowaveform

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.margelo.nitro.audiowaveform.AudioPlayerBase
import com.margelo.nitro.audiowaveform.PlayerConfig
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.IOException

/**
 * Error types for AudioPlayer operations
 */
sealed class AudioPlayerError(message: String) : Exception(message) {
    class FileNotFound(path: String) : AudioPlayerError("Audio file not found: $path")
    class InvalidAudioFile(details: String) : AudioPlayerError("Invalid audio file: $details")
    class PlayerNotPrepared : AudioPlayerError("Player not prepared. Call prepare() first.")
    class PlaybackFailed(details: String) : AudioPlayerError("Playback failed: $details")
    class SeekFailed(details: String) : AudioPlayerError("Seek operation failed: $details")
    class InvalidParameter(details: String) : AudioPlayerError("Invalid parameter: $details")
}

/**
 * Kotlin implementation of AudioPlayer for Nitro Modules
 * 
 * This class inherits from AudioPlayerBase (C++) and provides
 * Android-specific implementation using MediaPlayer.
 * 
 * Key features:
 * - Direct JSI integration for playback callbacks
 * - Thread-safe state management via C++ base class
 * - MediaPlayer for audio playback
 * - Support for playback speed control
 * - Real-time position updates
 */
class AudioPlayerKotlin(private val context: Context) : AudioPlayerBase() {
    
    companion object {
        private const val TAG = "AudioPlayerKotlin"
    }
    
    // MARK: - Properties
    
    /** MediaPlayer instance for playback */
    private var mediaPlayer: MediaPlayer? = null
    
    /** Handler for playback position updates */
    private var updateHandler: Handler? = null
    
    /** Runnable for periodic position updates */
    private var updateRunnable: Runnable? = null
    
    /** Current audio file path */
    private var audioFilePath: String? = null
    
    /** Update frequency in milliseconds (default: 500ms for medium) */
    private var updateFrequency: Long = 500L
    
    /** Finish mode (0 = stop at end, 1 = loop) */
    private var finishMode: Int = 0
    
    /** Whether playback has finished */
    private var hasFinished: Boolean = false
    
    // MARK: - Initialization
    
    init {
        updateHandler = Handler(Looper.getMainLooper())
    }
    
    // MARK: - Player Lifecycle Methods
    
    /**
     * Prepare the audio player with the specified configuration
     * 
     * @param config PlayerConfig struct containing playback parameters
     * @return Promise resolving to true if preparation was successful
     */
    override fun prepare(config: PlayerConfig): Promise<Boolean> {
        return Promise.resolve {
            // Validate file path
            if (config.path.isEmpty()) {
                throw AudioPlayerError.InvalidParameter("File path cannot be empty")
            }
            
            // Check if file exists
            val file = File(config.path)
            if (!file.exists()) {
                throw AudioPlayerError.FileNotFound(config.path)
            }
            
            // Store file path
            audioFilePath = config.path
            
            // Configure update frequency based on config
            config.updateFrequency?.let { frequency ->
                updateFrequency = when (frequency) {
                    0 -> 1000L  // Low
                    1 -> 500L   // Medium
                    2 -> 100L   // High
                    else -> 500L
                }
            }
            
            // Create and configure MediaPlayer
            try {
                // Release any existing player
                releaseMediaPlayer()
                
                // Create new MediaPlayer
                mediaPlayer = MediaPlayer().apply {
                    // Set audio attributes for playback
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .build()
                    )
                    
                    // Set data source
                    try {
                        setDataSource(config.path)
                    } catch (e: IOException) {
                        throw AudioPlayerError.InvalidAudioFile(
                            "Failed to set data source: ${e.message}"
                        )
                    } catch (e: IllegalArgumentException) {
                        throw AudioPlayerError.InvalidAudioFile(
                            "Invalid file path: ${e.message}"
                        )
                    }
                    
                    // Set completion listener
                    setOnCompletionListener { mp ->
                        onPlaybackComplete()
                    }
                    
                    // Set error listener
                    setOnErrorListener { mp, what, extra ->
                        Log.e(TAG, "MediaPlayer error: what=$what, extra=$extra")
                        setState(PlayerState.Stopped)
                        stopUpdateTimer()
                        true // Error handled
                    }
                    
                    // Prepare the player (synchronous)
                    try {
                        prepare()
                    } catch (e: IOException) {
                        throw AudioPlayerError.PlaybackFailed(
                            "Failed to prepare player: ${e.message}"
                        )
                    } catch (e: IllegalStateException) {
                        throw AudioPlayerError.PlaybackFailed(
                            "Invalid player state: ${e.message}"
                        )
                    }
                    
                    // Set initial volume if specified
                    config.volume?.let { vol ->
                        val clampedVolume = vol.coerceIn(0.0, 1.0)
                        setVolume(clampedVolume.toFloat(), clampedVolume.toFloat())
                        currentVolume_.store(clampedVolume)
                    }
                    
                    // Set start position if specified
                    config.startPosition?.let { startPos ->
                        if (startPos > 0) {
                            try {
                                seekTo(startPos.toInt())
                            } catch (e: IllegalStateException) {
                                Log.w(TAG, "Failed to seek to start position: ${e.message}")
                            }
                        }
                    }
                }
                
                // Update state to Prepared
                setState(PlayerState.Prepared)
                hasFinished = false
                
                true
                
            } catch (e: AudioPlayerError) {
                // Clean up on error
                releaseMediaPlayer()
                throw e
            } catch (e: Exception) {
                // Clean up on error
                releaseMediaPlayer()
                throw AudioPlayerError.PlaybackFailed(
                    "Unexpected error during preparation: ${e.message}"
                )
            }
        }
    }
    
    /**
     * Start or resume audio playback
     * 
     * @param finishMode Playback finish mode (0 = stop at end, 1 = loop)
     * @param speed Playback speed multiplier (0.5 = half speed, 2.0 = double speed)
     * @return Promise resolving to true if playback started successfully
     */
    override fun start(finishMode: Int, speed: Double): Promise<Boolean> {
        return Promise.resolve {
            val player = mediaPlayer 
                ?: throw AudioPlayerError.PlayerNotPrepared()
            
            if (!isPrepared()) {
                throw AudioPlayerError.PlayerNotPrepared()
            }
            
            // Store finish mode
            this.finishMode = finishMode
            
            // Set looping based on finish mode
            player.isLooping = (finishMode == 1)
            
            // Set playback speed (requires API 23+)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val clampedSpeed = speed.coerceIn(0.5, 2.0).toFloat()
                try {
                    player.playbackParams = player.playbackParams.setSpeed(clampedSpeed)
                    currentSpeed_.store(clampedSpeed.toDouble())
                } catch (e: IllegalStateException) {
                    Log.w(TAG, "Failed to set playback speed: ${e.message}")
                }
            } else {
                Log.w(TAG, "Playback speed control requires Android M (API 23) or higher")
            }
            
            // Start playback
            try {
                player.start()
            } catch (e: IllegalStateException) {
                throw AudioPlayerError.PlaybackFailed(
                    "Failed to start playback: ${e.message}"
                )
            }
            
            // Update state
            setState(PlayerState.Playing)
            hasFinished = false
            
            // Start update timer
            startUpdateTimer()
            
            true
        }
    }
    
    /**
     * Pause the current playback
     * 
     * @return Promise resolving to true if paused successfully
     */
    override fun pause(): Promise<Boolean> {
        return Promise.resolve {
            val player = mediaPlayer 
                ?: throw AudioPlayerError.PlayerNotPrepared()
            
            if (!isInPlayingState()) {
                throw AudioPlayerError.PlaybackFailed("Player is not playing")
            }
            
            try {
                player.pause()
            } catch (e: IllegalStateException) {
                throw AudioPlayerError.PlaybackFailed(
                    "Failed to pause playback: ${e.message}"
                )
            }
            
            setState(PlayerState.Paused)
            stopUpdateTimer()
            
            true
        }
    }
    
    /**
     * Stop playback and reset to the beginning
     * 
     * @return Promise resolving to true if stopped successfully
     */
    override fun stop(): Promise<Boolean> {
        return Promise.resolve {
            val player = mediaPlayer 
                ?: throw AudioPlayerError.PlayerNotPrepared()
            
            try {
                player.stop()
                player.prepare() // Re-prepare after stop
                player.seekTo(0)
            } catch (e: IllegalStateException) {
                throw AudioPlayerError.PlaybackFailed(
                    "Failed to stop playback: ${e.message}"
                )
            } catch (e: IOException) {
                throw AudioPlayerError.PlaybackFailed(
                    "Failed to re-prepare after stop: ${e.message}"
                )
            }
            
            setState(PlayerState.Stopped)
            stopUpdateTimer()
            
            true
        }
    }
    
    // MARK: - Playback Control Methods
    
    /**
     * Seek to a specific position in the audio
     * 
     * @param position Target position in milliseconds
     * @return Promise resolving to true if seek was successful
     */
    override fun seekTo(position: Double): Promise<Boolean> {
        return Promise.resolve {
            val player = mediaPlayer 
                ?: throw AudioPlayerError.PlayerNotPrepared()
            
            if (!isPrepared()) {
                throw AudioPlayerError.PlayerNotPrepared()
            }
            
            // Validate position
            if (position < 0) {
                throw AudioPlayerError.InvalidParameter("Position cannot be negative")
            }
            
            // Clamp to valid range
            val duration = player.duration
            val clampedPosition = position.coerceAtMost(duration.toDouble()).toInt()
            
            // Perform seek
            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    player.seekTo(clampedPosition.toLong(), MediaPlayer.SEEK_CLOSEST)
                } else {
                    player.seekTo(clampedPosition)
                }
            } catch (e: IllegalStateException) {
                throw AudioPlayerError.SeekFailed(
                    "Failed to seek: ${e.message}"
                )
            }
            
            true
        }
    }
    
    /**
     * Set the playback volume
     * 
     * @param volume Volume level (0.0 = silent, 1.0 = maximum)
     * @return Promise resolving to true if volume was set successfully
     */
    override fun setVolume(volume: Double): Promise<Boolean> {
        return Promise.resolve {
            val player = mediaPlayer 
                ?: throw AudioPlayerError.PlayerNotPrepared()
            
            // Validate volume
            if (volume < 0.0 || volume > 1.0) {
                throw AudioPlayerError.InvalidParameter(
                    "Volume must be between 0.0 and 1.0"
                )
            }
            
            try {
                val volumeFloat = volume.toFloat()
                player.setVolume(volumeFloat, volumeFloat)
                currentVolume_.store(volume)
            } catch (e: IllegalStateException) {
                throw AudioPlayerError.PlaybackFailed(
                    "Failed to set volume: ${e.message}"
                )
            }
            
            true
        }
    }
    
    /**
     * Set the playback speed
     * 
     * @param speed Speed multiplier (0.5 to 2.0 recommended)
     * @return Promise resolving to true if speed was set successfully
     */
    override fun setPlaybackSpeed(speed: Double): Promise<Boolean> {
        return Promise.resolve {
            val player = mediaPlayer 
                ?: throw AudioPlayerError.PlayerNotPrepared()
            
            // Validate speed range
            if (speed < 0.5 || speed > 2.0) {
                throw AudioPlayerError.InvalidParameter(
                    "Speed must be between 0.5 and 2.0"
                )
            }
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                try {
                    player.playbackParams = player.playbackParams.setSpeed(speed.toFloat())
                    currentSpeed_.store(speed)
                } catch (e: IllegalStateException) {
                    throw AudioPlayerError.PlaybackFailed(
                        "Failed to set playback speed: ${e.message}"
                    )
                }
            } else {
                throw AudioPlayerError.PlaybackFailed(
                    "Playback speed control requires Android M (API 23) or higher"
                )
            }
            
            true
        }
    }
    
    // MARK: - State Query Methods
    
    /**
     * Get the duration of the audio file
     * 
     * @param durationType Duration type (0 = Current, 1 = Max)
     * @return Promise resolving to the duration in milliseconds
     */
    override fun getDuration(durationType: Int): Promise<Double> {
        return Promise.resolve {
            val player = mediaPlayer 
                ?: throw AudioPlayerError.PlayerNotPrepared()
            
            try {
                val duration = player.duration
                duration.toDouble()
            } catch (e: IllegalStateException) {
                throw AudioPlayerError.PlaybackFailed(
                    "Failed to get duration: ${e.message}"
                )
            }
        }
    }
    
    /**
     * Get the current playback position
     * 
     * @return Promise resolving to the current position in milliseconds
     */
    override fun getCurrentPosition(): Promise<Double> {
        return Promise.resolve {
            val player = mediaPlayer 
                ?: throw AudioPlayerError.PlayerNotPrepared()
            
            try {
                val currentPosition = player.currentPosition
                currentPosition.toDouble()
            } catch (e: IllegalStateException) {
                throw AudioPlayerError.PlaybackFailed(
                    "Failed to get current position: ${e.message}"
                )
            }
        }
    }
    
    /**
     * Check if the player is currently playing
     * 
     * @return true if audio is currently playing, false otherwise
     */
    override fun isPlaying(): Boolean {
        return try {
            mediaPlayer?.isPlaying ?: false
        } catch (e: IllegalStateException) {
            false
        }
    }
    
    // MARK: - Callback Registration
    
    /**
     * Register a callback for playback position updates
     * 
     * @param callback Function to be called with position updates (in milliseconds)
     */
    override fun onPlaybackUpdate(callback: (Double) -> Unit) {
        setPlaybackUpdateCallback(callback)
    }
    
    /**
     * Register a callback for playback completion
     * 
     * @param callback Function to be called when playback finishes
     */
    override fun onPlaybackFinished(callback: () -> Unit) {
        setPlaybackFinishedCallback(callback)
    }
    
    // MARK: - Private Helper Methods
    
    /**
     * Release MediaPlayer resources
     */
    private fun releaseMediaPlayer() {
        mediaPlayer?.apply {
            try {
                if (isPlaying) {
                    stop()
                }
                reset()
                release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing MediaPlayer: ${e.message}")
            }
        }
        mediaPlayer = null
    }
    
    /**
     * Start the update timer for position callbacks
     */
    private fun startUpdateTimer() {
        stopUpdateTimer()
        
        if (!hasPlaybackUpdateCallback()) {
            return
        }
        
        updateRunnable = object : Runnable {
            override fun run() {
                val player = mediaPlayer
                if (player != null && player.isPlaying) {
                    try {
                        val currentTimeMs = player.currentPosition.toDouble()
                        invokePlaybackUpdateCallback(currentTimeMs)
                    } catch (e: IllegalStateException) {
                        Log.w(TAG, "Failed to get current position: ${e.message}")
                    }
                    
                    // Schedule next update
                    updateHandler?.postDelayed(this, updateFrequency)
                }
            }
        }
        
        updateHandler?.post(updateRunnable!!)
    }
    
    /**
     * Stop the update timer
     */
    private fun stopUpdateTimer() {
        updateRunnable?.let { runnable ->
            updateHandler?.removeCallbacks(runnable)
        }
        updateRunnable = null
    }
    
    /**
     * Handle playback completion
     */
    private fun onPlaybackComplete() {
        // Only trigger callback if not looping
        if (finishMode != 1 && !hasFinished) {
            hasFinished = true
            setState(PlayerState.Stopped)
            stopUpdateTimer()
            invokePlaybackFinishedCallback()
        }
    }
    
    /**
     * Clean up resources when object is destroyed
     */
    protected fun finalize() {
        stopUpdateTimer()
        releaseMediaPlayer()
    }
}
