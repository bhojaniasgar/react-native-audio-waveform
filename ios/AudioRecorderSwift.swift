//
//  AudioRecorderSwift.swift
//  AudioWaveform
//
//  Created for Nitro Modules Migration
//

import Foundation
import AVFoundation
import NitroModules

/**
 * Error types for AudioRecorder operations
 */
enum AudioRecorderError: Error {
    case permissionDenied
    case audioSessionSetupFailed(String)
    case fileSystemError(String)
    case recordingFailed(String)
    case noActiveRecording
    case invalidConfiguration(String)
    case encodingError(String)
    
    var localizedDescription: String {
        switch self {
        case .permissionDenied:
            return "Audio recording permission denied. Please grant permission in Settings."
        case .audioSessionSetupFailed(let details):
            return "Failed to configure audio session: \(details)"
        case .fileSystemError(let details):
            return "File system error: \(details)"
        case .recordingFailed(let details):
            return "Recording failed: \(details)"
        case .noActiveRecording:
            return "No active recording session"
        case .invalidConfiguration(let details):
            return "Invalid recording configuration: \(details)"
        case .encodingError(let details):
            return "Audio encoding error: \(details)"
        }
    }
}

/**
 * Swift implementation of AudioRecorder for Nitro Modules
 * 
 * This class inherits from AudioRecorderBase (C++) and provides
 * iOS-specific implementation using AVAudioRecorder.
 * 
 * Key features:
 * - Direct JSI integration for real-time decibel callbacks
 * - Thread-safe callback management via C++ base class
 * - AVAudioSession configuration for recording
 * - Permission handling for iOS
 * - Comprehensive error handling for all edge cases
 */
public class AudioRecorderSwift: AudioRecorderBase {
    // MARK: - Properties
    
    /// AVAudioRecorder instance for recording
    private var audioRecorder: AVAudioRecorder?
    
    /// Timer for real-time decibel monitoring
    private var meteringTimer: Timer?
    
    /// Current recording file URL
    private var audioUrl: URL?
    
    /// Whether to use legacy normalization for decibel values
    private var useLegacyNormalization: Bool = false
    
    /// Update frequency for decibel monitoring (default: medium = 500ms)
    private var updateFrequency: Double = 500.0
    
    // MARK: - Initialization
    
    public override init() {
        super.init()
    }
    
    deinit {
        stopListening()
        audioRecorder = nil
    }
    
    // MARK: - Permission Methods
    
    /**
     * Check if audio recording permission is granted
     * 
     * @returns Promise resolving to "granted", "denied", or "undetermined"
     */
    public override func checkHasPermission() -> Promise<String> {
        return Promise<String> { resolve, reject in
            let status = AVAudioSession.sharedInstance().recordPermission
            
            switch status {
            case .granted:
                resolve("granted")
            case .denied:
                resolve("denied")
            case .undetermined:
                resolve("undetermined")
            @unknown default:
                resolve("undetermined")
            }
        }
    }
    
    /**
     * Request audio recording permission from user
     * 
     * @returns Promise resolving to permission status after request
     */
    public override func getPermission() -> Promise<String> {
        return Promise<String> { resolve, reject in
            AVAudioSession.sharedInstance().requestRecordPermission { allowed in
                DispatchQueue.main.async {
                    resolve(allowed ? "granted" : "denied")
                }
            }
        }
    }
    
    // MARK: - Recording Control Methods
    
    /**
     * Start audio recording with given configuration
     * 
     * @param config RecordingConfig struct containing recording parameters
     * @returns Promise resolving to true if recording started successfully
     */
    public override func startRecording(_ config: RecordingConfig) -> Promise<Bool> {
        return Promise<Bool> { resolve, reject in
            // Check permission first
            let permission = AVAudioSession.sharedInstance().recordPermission
            guard permission == .granted else {
                reject(self.createNSError(
                    from: .permissionDenied,
                    code: -1
                ))
                return
            }
            
            // Store legacy normalization preference
            self.useLegacyNormalization = config.useLegacyNormalization ?? false
            
            // Validate and determine file URL
            do {
                if let path = config.path {
                    // Validate custom path
                    try self.validateFilePath(path)
                    self.audioUrl = URL(fileURLWithPath: path)
                } else {
                    // Generate new path
                    guard let newPath = self.createAudioRecordPath(fileNameFormat: config.fileNameFormat) else {
                        reject(self.createNSError(
                            from: .fileSystemError("Failed to create recording directory"),
                            code: -2
                        ))
                        return
                    }
                    self.audioUrl = newPath
                }
            } catch let error as AudioRecorderError {
                reject(self.createNSError(from: error, code: -3))
                return
            } catch {
                reject(self.createNSError(
                    from: .fileSystemError(error.localizedDescription),
                    code: -4
                ))
                return
            }
            
            // Validate configuration
            do {
                try self.validateRecordingConfig(config)
            } catch let error as AudioRecorderError {
                reject(self.createNSError(from: error, code: -5))
                return
            } catch {
                reject(self.createNSError(
                    from: .invalidConfiguration(error.localizedDescription),
                    code: -6
                ))
                return
            }
            
            // Configure audio settings
            let settings: [String: Any] = [
                AVFormatIDKey: self.getEncoder(config.encoder ?? 1),
                AVSampleRateKey: config.sampleRate ?? 44100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
                AVEncoderBitRateKey: config.bitRate ?? 128000
            ]
            
            // Configure AVAudioSession with error handling
            let options: AVAudioSession.CategoryOptions = [
                .defaultToSpeaker,
                .allowBluetooth,
                .mixWithOthers
            ]
            
            do {
                let audioSession = AVAudioSession.sharedInstance()
                
                // Try to set category
                try audioSession.setCategory(
                    .playAndRecord,
                    options: options
                )
                
                // Try to activate session
                try audioSession.setActive(true)
                
            } catch let error as NSError {
                // Handle specific AVAudioSession errors
                let errorMessage: String
                switch error.code {
                case AVAudioSession.ErrorCode.cannotInterruptOthers.rawValue:
                    errorMessage = "Cannot interrupt other audio sessions. Another app may be using audio."
                case AVAudioSession.ErrorCode.mediaServicesFailed.rawValue:
                    errorMessage = "Media services failed. Try restarting the device."
                case AVAudioSession.ErrorCode.badParam.rawValue:
                    errorMessage = "Invalid audio session parameters."
                case AVAudioSession.ErrorCode.insufficientPriority.rawValue:
                    errorMessage = "Insufficient priority to activate audio session."
                case AVAudioSession.ErrorCode.resourceNotAvailable.rawValue:
                    errorMessage = "Audio hardware not available. Check if another app is using the microphone."
                default:
                    errorMessage = error.localizedDescription
                }
                
                reject(self.createNSError(
                    from: .audioSessionSetupFailed(errorMessage),
                    code: -7
                ))
                return
            }
            
            // Create and configure AVAudioRecorder
            guard let audioUrl = self.audioUrl else {
                reject(self.createNSError(
                    from: .fileSystemError("Audio URL not initialized"),
                    code: -8
                ))
                return
            }
            
            do {
                self.audioRecorder = try AVAudioRecorder(url: audioUrl, settings: settings)
                self.audioRecorder?.delegate = self
                self.audioRecorder?.isMeteringEnabled = true
                
                // Prepare to record (pre-allocates resources)
                guard self.audioRecorder?.prepareToRecord() ?? false else {
                    reject(self.createNSError(
                        from: .recordingFailed("Failed to prepare recorder"),
                        code: -9
                    ))
                    return
                }
                
                // Start recording
                guard self.audioRecorder?.record() ?? false else {
                    reject(self.createNSError(
                        from: .recordingFailed("Failed to start recording. Check microphone availability."),
                        code: -10
                    ))
                    return
                }
                
                // Update state
                self.isRecording_.store(true, ordering: .relaxed)
                self.isPaused_.store(false, ordering: .relaxed)
                self.startListening()
                resolve(true)
                
            } catch let error as NSError {
                // Handle AVAudioRecorder creation errors
                let errorMessage: String
                if error.domain == NSOSStatusErrorDomain {
                    errorMessage = "Audio format not supported: \(self.getFormatErrorDescription(error.code))"
                } else {
                    errorMessage = error.localizedDescription
                }
                
                reject(self.createNSError(
                    from: .recordingFailed(errorMessage),
                    code: -11
                ))
            }
        }
    }
    
    /**
     * Stop current recording and finalize audio file
     * 
     * @returns Promise resolving to file path of recorded audio
     */
    public override func stopRecording() -> Promise<String> {
        return Promise<String> { resolve, reject in
            guard self.audioRecorder != nil else {
                reject(self.createNSError(
                    from: .noActiveRecording,
                    code: -20
                ))
                return
            }
            
            self.stopListening()
            self.audioRecorder?.stop()
            
            self.isRecording_.store(false, ordering: .relaxed)
            self.isPaused_.store(false, ordering: .relaxed)
            
            guard let audioUrl = self.audioUrl else {
                reject(self.createNSError(
                    from: .fileSystemError("No recording URL available"),
                    code: -21
                ))
                return
            }
            
            // Verify file was created and is accessible
            let fileManager = FileManager.default
            guard fileManager.fileExists(atPath: audioUrl.path) else {
                reject(self.createNSError(
                    from: .fileSystemError("Recording file was not created"),
                    code: -22
                ))
                return
            }
            
            // Verify file has content
            do {
                let attributes = try fileManager.attributesOfItem(atPath: audioUrl.path)
                let fileSize = attributes[.size] as? UInt64 ?? 0
                
                if fileSize == 0 {
                    reject(self.createNSError(
                        from: .fileSystemError("Recording file is empty"),
                        code: -23
                    ))
                    return
                }
            } catch {
                reject(self.createNSError(
                    from: .fileSystemError("Failed to verify recording file: \(error.localizedDescription)"),
                    code: -24
                ))
                return
            }
            
            // Deactivate audio session
            do {
                try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            } catch {
                // Log warning but don't fail - file was recorded successfully
                print("AudioRecorderSwift: Warning - Failed to deactivate audio session: \(error.localizedDescription)")
            }
            
            // Return the file path
            let filePath = audioUrl.path
            resolve(filePath)
            
            // Clean up
            self.audioRecorder = nil
            self.audioUrl = nil
        }
    }
    
    /**
     * Pause current recording
     * 
     * @returns Promise resolving to true if paused successfully
     */
    public override func pauseRecording() -> Promise<Bool> {
        return Promise<Bool> { resolve, reject in
            guard let recorder = self.audioRecorder else {
                reject(self.createNSError(
                    from: .noActiveRecording,
                    code: -30
                ))
                return
            }
            
            guard recorder.isRecording else {
                reject(self.createNSError(
                    from: .recordingFailed("Recording is not active"),
                    code: -31
                ))
                return
            }
            
            recorder.pause()
            self.isPaused_.store(true, ordering: .relaxed)
            resolve(true)
        }
    }
    
    /**
     * Resume paused recording
     * 
     * @returns Promise resolving to true if resumed successfully
     */
    public override func resumeRecording() -> Promise<Bool> {
        return Promise<Bool> { resolve, reject in
            guard let recorder = self.audioRecorder else {
                reject(self.createNSError(
                    from: .noActiveRecording,
                    code: -40
                ))
                return
            }
            
            guard self.isPaused_.load(ordering: .relaxed) else {
                reject(self.createNSError(
                    from: .recordingFailed("Recording is not paused"),
                    code: -41
                ))
                return
            }
            
            guard recorder.record() else {
                reject(self.createNSError(
                    from: .recordingFailed("Failed to resume recording. Microphone may be unavailable."),
                    code: -42
                ))
                return
            }
            
            self.isPaused_.store(false, ordering: .relaxed)
            resolve(true)
        }
    }
    
    // MARK: - Real-time Monitoring
    
    /**
     * Get current decibel level snapshot
     * 
     * @returns Promise resolving to current decibel level
     */
    public override func getDecibel() -> Promise<Double> {
        return Promise<Double> { resolve, reject in
            guard let recorder = self.audioRecorder else {
                reject(self.createNSError(
                    from: .noActiveRecording,
                    code: -50
                ))
                return
            }
            
            guard recorder.isRecording else {
                reject(self.createNSError(
                    from: .recordingFailed("Recording is not active"),
                    code: -51
                ))
                return
            }
            
            let decibel = self.getDecibelLevel()
            resolve(Double(decibel))
        }
    }
    
    /**
     * Register callback for real-time decibel updates
     * 
     * @param callback Function to invoke with decibel updates
     */
    public override func onDecibelUpdate(_ callback: @escaping (Double) -> Void) {
        self.setDecibelCallback(callback)
    }
    
    // MARK: - Private Helper Methods
    
    /**
     * Create a file path for audio recording
     * 
     * @param fileNameFormat Optional date format string for filename
     * @returns URL for the recording file
     */
    private func createAudioRecordPath(fileNameFormat: String?) -> URL? {
        let format = DateFormatter()
        format.dateFormat = fileNameFormat ?? "yyyy-MM-dd-HH-mm-ss-SSS"
        let currentFileName = "\(format.string(from: Date())).m4a"
        
        let documentsDirectory = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        )[0]
        
        let fileUrl = documentsDirectory.appendingPathComponent(currentFileName)
        
        // Ensure directory exists
        let directory = fileUrl.deletingLastPathComponent()
        if !FileManager.default.fileExists(atPath: directory.path) {
            do {
                try FileManager.default.createDirectory(
                    at: directory,
                    withIntermediateDirectories: true,
                    attributes: nil
                )
            } catch {
                print("AudioRecorderSwift: Failed to create directory: \(error.localizedDescription)")
                return nil
            }
        }
        
        return fileUrl
    }
    
    /**
     * Validate file path for recording
     * 
     * @param path File path to validate
     * @throws AudioRecorderError if path is invalid
     */
    private func validateFilePath(_ path: String) throws {
        // Check if path is empty
        guard !path.isEmpty else {
            throw AudioRecorderError.fileSystemError("File path cannot be empty")
        }
        
        // Check if directory exists
        let url = URL(fileURLWithPath: path)
        let directory = url.deletingLastPathComponent()
        
        var isDirectory: ObjCBool = false
        let directoryExists = FileManager.default.fileExists(
            atPath: directory.path,
            isDirectory: &isDirectory
        )
        
        if !directoryExists {
            // Try to create directory
            do {
                try FileManager.default.createDirectory(
                    at: directory,
                    withIntermediateDirectories: true,
                    attributes: nil
                )
            } catch {
                throw AudioRecorderError.fileSystemError(
                    "Cannot create directory: \(error.localizedDescription)"
                )
            }
        } else if !isDirectory.boolValue {
            throw AudioRecorderError.fileSystemError(
                "Path exists but is not a directory: \(directory.path)"
            )
        }
        
        // Check if file already exists
        if FileManager.default.fileExists(atPath: path) {
            // Try to remove existing file
            do {
                try FileManager.default.removeItem(atPath: path)
            } catch {
                throw AudioRecorderError.fileSystemError(
                    "Cannot overwrite existing file: \(error.localizedDescription)"
                )
            }
        }
        
        // Check if we have write permission
        let testData = Data()
        do {
            try testData.write(to: url)
            try FileManager.default.removeItem(at: url)
        } catch {
            throw AudioRecorderError.fileSystemError(
                "No write permission for path: \(error.localizedDescription)"
            )
        }
    }
    
    /**
     * Validate recording configuration
     * 
     * @param config Recording configuration to validate
     * @throws AudioRecorderError if configuration is invalid
     */
    private func validateRecordingConfig(_ config: RecordingConfig) throws {
        // Validate sample rate
        if let sampleRate = config.sampleRate {
            guard sampleRate > 0 && sampleRate <= 192000 else {
                throw AudioRecorderError.invalidConfiguration(
                    "Sample rate must be between 1 and 192000 Hz, got \(sampleRate)"
                )
            }
        }
        
        // Validate bit rate
        if let bitRate = config.bitRate {
            guard bitRate > 0 && bitRate <= 320000 else {
                throw AudioRecorderError.invalidConfiguration(
                    "Bit rate must be between 1 and 320000 bps, got \(bitRate)"
                )
            }
        }
        
        // Validate encoder
        if let encoder = config.encoder {
            let validEncoders = [
                Constants.kAudioFormatMPEG4AAC,
                Constants.kAudioFormatMPEGLayer1,
                Constants.kAudioFormatMPEGLayer2,
                Constants.kAudioFormatMPEGLayer3,
                Constants.kAudioFormatMPEG4AAC_ELD,
                Constants.kAudioFormatMPEG4AAC_HE,
                Constants.kAudioFormatOpus,
                Constants.kAudioFormatAMR,
                Constants.kAudioFormatAMR_WB,
                Constants.kAudioFormatLinearPCM,
                Constants.kAudioFormatAppleLossless,
                Constants.kAudioFormatMPEG4AAC_HE_V2
            ]
            
            guard validEncoders.contains(encoder) else {
                throw AudioRecorderError.invalidConfiguration(
                    "Invalid encoder format: \(encoder)"
                )
            }
        }
    }
    
    /**
     * Create NSError from AudioRecorderError
     * 
     * @param error AudioRecorderError to convert
     * @param code Error code
     * @returns NSError instance
     */
    private func createNSError(from error: AudioRecorderError, code: Int) -> NSError {
        return NSError(
            domain: "AudioRecorderSwift",
            code: code,
            userInfo: [
                NSLocalizedDescriptionKey: error.localizedDescription,
                NSLocalizedFailureReasonErrorKey: error.localizedDescription
            ]
        )
    }
    
    /**
     * Get human-readable description for audio format errors
     * 
     * @param code OSStatus error code
     * @returns Error description
     */
    private func getFormatErrorDescription(_ code: Int) -> String {
        switch code {
        case kAudioFormatUnsupportedDataFormatError:
            return "Unsupported data format"
        case kAudioFormatUnsupportedPropertyError:
            return "Unsupported property"
        case kAudioFormatBadPropertySizeError:
            return "Bad property size"
        case kAudioFormatBadSpecifierSizeError:
            return "Bad specifier size"
        case kAudioFormatUnspecifiedError:
            return "Unspecified format error"
        default:
            return "Unknown format error (code: \(code))"
        }
    }
    
    /**
     * Get current decibel level from audio recorder
     * 
     * @returns Current decibel level as Float
     */
    private func getDecibelLevel() -> Float {
        audioRecorder?.updateMeters()
        
        if useLegacyNormalization {
            // Use average power for legacy mode
            return audioRecorder?.averagePower(forChannel: 0) ?? -160.0
        } else {
            // Use peak power and convert to linear scale
            let peakPower = audioRecorder?.peakPower(forChannel: 0) ?? -160.0
            let linear = pow(10, peakPower / 20)
            return linear
        }
    }
    
    /**
     * Start listening for decibel updates
     * Sets up a timer to periodically check and report decibel levels
     */
    private func startListening() {
        stopListening()
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Convert milliseconds to seconds for Timer interval
            let interval = TimeInterval(self.updateFrequency / 1000.0)
            
            self.meteringTimer = Timer.scheduledTimer(
                withTimeInterval: interval,
                repeats: true
            ) { [weak self] _ in
                self?.timerUpdate()
            }
        }
    }
    
    /**
     * Stop listening for decibel updates
     * Invalidates and clears the metering timer
     */
    private func stopListening() {
        meteringTimer?.invalidate()
        meteringTimer = nil
    }
    
    /**
     * Timer callback for decibel updates
     * Invokes the C++ callback with current decibel level
     */
    @objc private func timerUpdate() {
        guard audioRecorder?.isRecording ?? false else { return }
        
        let decibel = getDecibelLevel()
        
        // Invoke C++ callback (thread-safe)
        invokeDecibelCallback(Double(decibel))
    }
    
    /**
     * Get encoder format ID from config value
     * 
     * @param encoder Encoder constant from config
     * @returns AVAudioFormat ID
     */
    private func getEncoder(_ encoder: Int) -> Int {
        switch encoder {
        case Constants.kAudioFormatMPEG4AAC:
            return Int(kAudioFormatMPEG4AAC)
        case Constants.kAudioFormatMPEGLayer1:
            return Int(kAudioFormatMPEGLayer1)
        case Constants.kAudioFormatMPEGLayer2:
            return Int(kAudioFormatMPEGLayer2)
        case Constants.kAudioFormatMPEGLayer3:
            return Int(kAudioFormatMPEGLayer3)
        case Constants.kAudioFormatMPEG4AAC_ELD:
            return Int(kAudioFormatMPEG4AAC_ELD)
        case Constants.kAudioFormatMPEG4AAC_HE:
            return Int(kAudioFormatMPEG4AAC_HE)
        case Constants.kAudioFormatOpus:
            return Int(kAudioFormatOpus)
        case Constants.kAudioFormatAMR:
            return Int(kAudioFormatAMR)
        case Constants.kAudioFormatAMR_WB:
            return Int(kAudioFormatAMR_WB)
        case Constants.kAudioFormatLinearPCM:
            return Int(kAudioFormatLinearPCM)
        case Constants.kAudioFormatAppleLossless:
            return Int(kAudioFormatAppleLossless)
        case Constants.kAudioFormatMPEG4AAC_HE_V2:
            return Int(kAudioFormatMPEG4AAC_HE_V2)
        default:
            return Int(kAudioFormatMPEG4AAC)
        }
    }
}

// MARK: - AVAudioRecorderDelegate

extension AudioRecorderSwift: AVAudioRecorderDelegate {
    /**
     * Called when recording finishes
     * 
     * @param recorder The audio recorder
     * @param flag Whether recording finished successfully
     */
    public func audioRecorderDidFinishRecording(
        _ recorder: AVAudioRecorder,
        successfully flag: Bool
    ) {
        if !flag {
            print("AudioRecorderSwift: Recording did not finish successfully")
            
            // Clean up failed recording file
            if let url = audioUrl {
                try? FileManager.default.removeItem(at: url)
            }
        }
        
        isRecording_.store(false, ordering: .relaxed)
        isPaused_.store(false, ordering: .relaxed)
        stopListening()
    }
    
    /**
     * Called when an encoding error occurs
     * 
     * @param recorder The audio recorder
     * @param error The error that occurred
     */
    public func audioRecorderEncodeErrorDidOccur(
        _ recorder: AVAudioRecorder,
        error: Error?
    ) {
        if let error = error {
            let nsError = error as NSError
            let errorMessage: String
            
            // Provide specific error messages based on error code
            switch nsError.code {
            case AVAudioSession.ErrorCode.cannotInterruptOthers.rawValue:
                errorMessage = "Cannot interrupt other audio. Another app may be recording."
            case AVAudioSession.ErrorCode.mediaServicesFailed.rawValue:
                errorMessage = "Media services failed. Try restarting the device."
            case AVAudioSession.ErrorCode.resourceNotAvailable.rawValue:
                errorMessage = "Audio resource not available. Microphone may be in use."
            default:
                errorMessage = error.localizedDescription
            }
            
            print("AudioRecorderSwift: Encoding error - \(errorMessage)")
        }
        
        // Clean up on error
        isRecording_.store(false, ordering: .relaxed)
        isPaused_.store(false, ordering: .relaxed)
        stopListening()
        
        // Clean up failed recording file
        if let url = audioUrl {
            try? FileManager.default.removeItem(at: url)
        }
        
        // Deactivate audio session
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
