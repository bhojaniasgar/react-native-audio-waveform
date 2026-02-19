//
//  AudioPlayerSwift.swift
//  AudioWaveform
//
//  Created for Nitro Modules Migration
//

import Foundation
import AVFoundation
import NitroModules

/**
 * Error types for AudioPlayer operations
 */
enum AudioPlayerError: Error {
    case fileNotFound(String)
    case invalidAudioFile(String)
    case playerNotPrepared
    case playbackFailed(String)
    case seekFailed(String)
    case invalidParameter(String)
    
    var localizedDescription: String {
        switch self {
        case .fileNotFound(let path):
            return "Audio file not found: \(path)"
        case .invalidAudioFile(let details):
            return "Invalid audio file: \(details)"
        case .playerNotPrepared:
            return "Player not prepared. Call prepare() first."
        case .playbackFailed(let details):
            return "Playback failed: \(details)"
        case .seekFailed(let details):
            return "Seek operation failed: \(details)"
        case .invalidParameter(let details):
            return "Invalid parameter: \(details)"
        }
    }
}

/**
 * Swift implementation of AudioPlayer for Nitro Modules
 * 
 * This class inherits from AudioPlayerBase (C++) and provides
 * iOS-specific implementation using AVAudioPlayer.
 * 
 * Key features:
 * - Direct JSI integration for playback callbacks
 * - Thread-safe state management via C++ base class
 * - AVAudioPlayer for audio playback
 * - Support for playback speed control
 * - Real-time position updates
 */
public class AudioPlayerSwift: AudioPlayerBase {
    // MARK: - Properties
    
    /// AVAudioPlayer instance for playback
    private var audioPlayer: AVAudioPlayer?
    
    /// Timer for playback position updates
    private var updateTimer: Timer?
    
    /// Current audio file URL
    private var audioUrl: URL?
    
    /// Update frequency in milliseconds (default: 500ms for medium)
    private var updateFrequency: Double = 500.0
    
    /// Finish mode (0 = stop at end, 1 = loop)
    private var finishMode: Int = 0
    
    /// Whether playback has finished
    private var hasFinished: Bool = false
    
    // MARK: - Initialization
    
    public override init() {
        super.init()
    }
    
    deinit {
        stopUpdateTimer()
        audioPlayer = nil
    }
    
    // MARK: - Player Lifecycle Methods
    
    /**
     * Prepare the audio player with the specified configuration
     * 
     * @param config PlayerConfig struct containing playback parameters
     * @returns Promise resolving to true if preparation was successful
     */
    public override func prepare(_ config: PlayerConfig) -> Promise<Bool> {
        return Promise<Bool> { resolve, reject in
            // Validate file path
            guard !config.path.isEmpty else {
                reject(self.createNSError(
                    from: .invalidParameter("File path cannot be empty"),
                    code: -1
                ))
                return
            }
            
            // Create URL from path
            let url = URL(fileURLWithPath: config.path)
            
            // Check if file exists
            guard FileManager.default.fileExists(atPath: url.path) else {
                reject(self.createNSError(
                    from: .fileNotFound(config.path),
                    code: -2
                ))
                return
            }
            
            // Store URL
            self.audioUrl = url
            
            // Configure update frequency based on config
            if let frequency = config.updateFrequency {
                switch frequency {
                case 0: // Low
                    self.updateFrequency = 1000.0
                case 1: // Medium
                    self.updateFrequency = 500.0
                case 2: // High
                    self.updateFrequency = 100.0
                default:
                    self.updateFrequency = 500.0
                }
            }
            
            // Configure AVAudioSession for playback
            do {
                let audioSession = AVAudioSession.sharedInstance()
                try audioSession.setCategory(.playback, mode: .default)
                try audioSession.setActive(true)
            } catch {
                reject(self.createNSError(
                    from: .playbackFailed("Failed to configure audio session: \(error.localizedDescription)"),
                    code: -3
                ))
                return
            }
            
            // Create AVAudioPlayer
            do {
                self.audioPlayer = try AVAudioPlayer(contentsOf: url)
                self.audioPlayer?.delegate = self
                self.audioPlayer?.enableRate = true // Enable playback speed control
                
                // Set initial volume if specified
                if let volume = config.volume {
                    let clampedVolume = max(0.0, min(1.0, volume))
                    self.audioPlayer?.volume = Float(clampedVolume)
                    self.currentVolume_.store(clampedVolume, ordering: .relaxed)
                }
                
                // Prepare to play (pre-allocates resources)
                guard self.audioPlayer?.prepareToPlay() ?? false else {
                    reject(self.createNSError(
                        from: .playbackFailed("Failed to prepare audio player"),
                        code: -4
                    ))
                    return
                }
                
                // Set start position if specified
                if let startPosition = config.startPosition, startPosition > 0 {
                    let startTime = TimeInterval(startPosition / 1000.0)
                    self.audioPlayer?.currentTime = startTime
                }
                
                // Update state to Prepared
                self.setState(.Prepared)
                self.hasFinished = false
                
                resolve(true)
                
            } catch {
                reject(self.createNSError(
                    from: .invalidAudioFile(error.localizedDescription),
                    code: -5
                ))
            }
        }
    }

    /**
     * Start or resume audio playback
     * 
     * @param finishMode Playback finish mode (0 = stop at end, 1 = loop)
     * @param speed Playback speed multiplier (0.5 = half speed, 2.0 = double speed)
     * @returns Promise resolving to true if playback started successfully
     */
    public override func start(_ finishMode: Int, _ speed: Double) -> Promise<Bool> {
        return Promise<Bool> { resolve, reject in
            guard let player = self.audioPlayer else {
                reject(self.createNSError(
                    from: .playerNotPrepared,
                    code: -10
                ))
                return
            }
            
            guard self.isPrepared() else {
                reject(self.createNSError(
                    from: .playerNotPrepared,
                    code: -11
                ))
                return
            }
            
            // Store finish mode
            self.finishMode = finishMode
            
            // Set looping based on finish mode
            player.numberOfLoops = (finishMode == 1) ? -1 : 0
            
            // Set playback speed
            let clampedSpeed = max(0.5, min(2.0, speed))
            player.rate = Float(clampedSpeed)
            self.currentSpeed_.store(clampedSpeed, ordering: .relaxed)
            
            // Start playback
            guard player.play() else {
                reject(self.createNSError(
                    from: .playbackFailed("Failed to start playback"),
                    code: -12
                ))
                return
            }
            
            // Update state
            self.setState(.Playing)
            self.hasFinished = false
            
            // Start update timer
            self.startUpdateTimer()
            
            resolve(true)
        }
    }
    
    /**
     * Pause the current playback
     * 
     * @returns Promise resolving to true if paused successfully
     */
    public override func pause() -> Promise<Bool> {
        return Promise<Bool> { resolve, reject in
            guard let player = self.audioPlayer else {
                reject(self.createNSError(
                    from: .playerNotPrepared,
                    code: -20
                ))
                return
            }
            
            guard self.isInPlayingState() else {
                reject(self.createNSError(
                    from: .playbackFailed("Player is not playing"),
                    code: -21
                ))
                return
            }
            
            player.pause()
            self.setState(.Paused)
            self.stopUpdateTimer()
            
            resolve(true)
        }
    }
    
    /**
     * Stop playback and reset to the beginning
     * 
     * @returns Promise resolving to true if stopped successfully
     */
    public override func stop() -> Promise<Bool> {
        return Promise<Bool> { resolve, reject in
            guard let player = self.audioPlayer else {
                reject(self.createNSError(
                    from: .playerNotPrepared,
                    code: -30
                ))
                return
            }
            
            player.stop()
            player.currentTime = 0
            self.setState(.Stopped)
            self.stopUpdateTimer()
            
            resolve(true)
        }
    }
    
    // MARK: - Playback Control Methods
    
    /**
     * Seek to a specific position in the audio
     * 
     * @param position Target position in milliseconds
     * @returns Promise resolving to true if seek was successful
     */
    public override func seekTo(_ position: Double) -> Promise<Bool> {
        return Promise<Bool> { resolve, reject in
            guard let player = self.audioPlayer else {
                reject(self.createNSError(
                    from: .playerNotPrepared,
                    code: -40
                ))
                return
            }
            
            guard self.isPrepared() else {
                reject(self.createNSError(
                    from: .playerNotPrepared,
                    code: -41
                ))
                return
            }
            
            // Validate position
            guard position >= 0 else {
                reject(self.createNSError(
                    from: .invalidParameter("Position cannot be negative"),
                    code: -42
                ))
                return
            }
            
            // Convert milliseconds to seconds
            let timeInSeconds = TimeInterval(position / 1000.0)
            
            // Clamp to valid range
            let duration = player.duration
            let clampedTime = min(timeInSeconds, duration)
            
            // Perform seek
            player.currentTime = clampedTime
            
            resolve(true)
        }
    }
    
    /**
     * Set the playback volume
     * 
     * @param volume Volume level (0.0 = silent, 1.0 = maximum)
     * @returns Promise resolving to true if volume was set successfully
     */
    public override func setVolume(_ volume: Double) -> Promise<Bool> {
        return Promise<Bool> { resolve, reject in
            guard let player = self.audioPlayer else {
                reject(self.createNSError(
                    from: .playerNotPrepared,
                    code: -50
                ))
                return
            }
            
            // Validate and clamp volume
            guard volume >= 0.0 && volume <= 1.0 else {
                reject(self.createNSError(
                    from: .invalidParameter("Volume must be between 0.0 and 1.0"),
                    code: -51
                ))
                return
            }
            
            player.volume = Float(volume)
            self.currentVolume_.store(volume, ordering: .relaxed)
            
            resolve(true)
        }
    }
    
    /**
     * Set the playback speed
     * 
     * @param speed Speed multiplier (0.5 to 2.0 recommended)
     * @returns Promise resolving to true if speed was set successfully
     */
    public override func setPlaybackSpeed(_ speed: Double) -> Promise<Bool> {
        return Promise<Bool> { resolve, reject in
            guard let player = self.audioPlayer else {
                reject(self.createNSError(
                    from: .playerNotPrepared,
                    code: -60
                ))
                return
            }
            
            // Validate speed range
            guard speed >= 0.5 && speed <= 2.0 else {
                reject(self.createNSError(
                    from: .invalidParameter("Speed must be between 0.5 and 2.0"),
                    code: -61
                ))
                return
            }
            
            player.rate = Float(speed)
            self.currentSpeed_.store(speed, ordering: .relaxed)
            
            resolve(true)
        }
    }
    
    // MARK: - State Query Methods
    
    /**
     * Get the duration of the audio file
     * 
     * @param durationType Duration type (0 = Current, 1 = Max)
     * @returns Promise resolving to the duration in milliseconds
     */
    public override func getDuration(_ durationType: Int) -> Promise<Double> {
        return Promise<Double> { resolve, reject in
            guard let player = self.audioPlayer else {
                reject(self.createNSError(
                    from: .playerNotPrepared,
                    code: -70
                ))
                return
            }
            
            let duration = player.duration
            let durationMs = duration * 1000.0
            
            resolve(durationMs)
        }
    }
    
    /**
     * Get the current playback position
     * 
     * @returns Promise resolving to the current position in milliseconds
     */
    public override func getCurrentPosition() -> Promise<Double> {
        return Promise<Double> { resolve, reject in
            guard let player = self.audioPlayer else {
                reject(self.createNSError(
                    from: .playerNotPrepared,
                    code: -80
                ))
                return
            }
            
            let currentTime = player.currentTime
            let currentTimeMs = currentTime * 1000.0
            
            resolve(currentTimeMs)
        }
    }
    
    /**
     * Check if the player is currently playing
     * 
     * @returns true if audio is currently playing, false otherwise
     */
    public override func isPlaying() -> Bool {
        return audioPlayer?.isPlaying ?? false
    }
    
    // MARK: - Callback Registration
    
    /**
     * Register a callback for playback position updates
     * 
     * @param callback Function to be called with position updates (in milliseconds)
     */
    public override func onPlaybackUpdate(_ callback: @escaping (Double) -> Void) {
        self.setPlaybackUpdateCallback(callback)
    }
    
    /**
     * Register a callback for playback completion
     * 
     * @param callback Function to be called when playback finishes
     */
    public override func onPlaybackFinished(_ callback: @escaping () -> Void) {
        self.setPlaybackFinishedCallback(callback)
    }
    
    // MARK: - Private Helper Methods
    
    /**
     * Start the update timer for position callbacks
     */
    private func startUpdateTimer() {
        stopUpdateTimer()
        
        guard self.hasPlaybackUpdateCallback() else {
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let interval = TimeInterval(self.updateFrequency / 1000.0)
            
            self.updateTimer = Timer.scheduledTimer(
                withTimeInterval: interval,
                repeats: true
            ) { [weak self] _ in
                self?.timerUpdate()
            }
        }
    }
    
    /**
     * Stop the update timer
     */
    private func stopUpdateTimer() {
        updateTimer?.invalidate()
        updateTimer = nil
    }
    
    /**
     * Timer callback for position updates
     */
    @objc private func timerUpdate() {
        guard let player = audioPlayer, player.isPlaying else {
            return
        }
        
        let currentTimeMs = player.currentTime * 1000.0
        self.invokePlaybackUpdateCallback(currentTimeMs)
    }
    
    /**
     * Create NSError from AudioPlayerError
     * 
     * @param error AudioPlayerError to convert
     * @param code Error code
     * @returns NSError instance
     */
    private func createNSError(from error: AudioPlayerError, code: Int) -> NSError {
        return NSError(
            domain: "AudioPlayerSwift",
            code: code,
            userInfo: [
                NSLocalizedDescriptionKey: error.localizedDescription,
                NSLocalizedFailureReasonErrorKey: error.localizedDescription
            ]
        )
    }
}

// MARK: - AVAudioPlayerDelegate

extension AudioPlayerSwift: AVAudioPlayerDelegate {
    /**
     * Called when playback finishes
     * 
     * @param player The audio player
     * @param flag Whether playback finished successfully
     */
    public func audioPlayerDidFinishPlaying(
        _ player: AVAudioPlayer,
        successfully flag: Bool
    ) {
        // Only trigger callback if not looping
        if finishMode != 1 && !hasFinished {
            hasFinished = true
            self.setState(.Stopped)
            self.stopUpdateTimer()
            self.invokePlaybackFinishedCallback()
        }
    }
    
    /**
     * Called when a decoding error occurs
     * 
     * @param player The audio player
     * @param error The error that occurred
     */
    public func audioPlayerDecodeErrorDidOccur(
        _ player: AVAudioPlayer,
        error: Error?
    ) {
        if let error = error {
            print("AudioPlayerSwift: Decode error - \(error.localizedDescription)")
        }
        
        self.setState(.Stopped)
        self.stopUpdateTimer()
    }
}
