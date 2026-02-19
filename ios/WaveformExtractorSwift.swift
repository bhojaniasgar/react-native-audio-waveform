//
//  WaveformExtractorSwift.swift
//  AudioWaveform
//
//  Created for Nitro Modules Migration
//

import Foundation
import AVFoundation
import NitroModules

/**
 * Error types for WaveformExtractor operations
 */
enum WaveformExtractorError: Error {
    case fileNotFound(String)
    case invalidAudioFile(String)
    case decodingFailed(String)
    case assetLoadingFailed(String)
    case unsupportedFormat(String)
    
    var localizedDescription: String {
        switch self {
        case .fileNotFound(let path):
            return "Audio file not found: \(path)"
        case .invalidAudioFile(let details):
            return "Invalid audio file: \(details)"
        case .decodingFailed(let details):
            return "Audio decoding failed: \(details)"
        case .assetLoadingFailed(let details):
            return "Failed to load audio asset: \(details)"
        case .unsupportedFormat(let details):
            return "Unsupported audio format: \(details)"
        }
    }
}

/**
 * Swift implementation of WaveformExtractor for Nitro Modules
 * 
 * This class inherits from WaveformExtractorBase (C++) and provides
 * iOS-specific implementation for audio decoding using AVAssetReader.
 * 
 * Key features:
 * - AVAssetReader for efficient audio decoding
 * - Support for various audio formats (M4A, MP3, WAV, etc.)
 * - Direct integration with C++ waveform processing
 * - Thread-safe progress tracking via C++ base class
 * - Cancellation support for long-running extractions
 * 
 * Architecture:
 * - Swift layer: Audio decoding (this class)
 * - C++ layer: Waveform processing and normalization (WaveformExtractorBase)
 * - JavaScript layer: API calls via JSI
 */
public class WaveformExtractorSwift: WaveformExtractorBase {
    // MARK: - Properties
    
    /// Current audio asset being processed
    private var audioAsset: AVAsset?
    
    /// Asset reader for audio decoding
    private var assetReader: AVAssetReader?
    
    // MARK: - Initialization
    
    public override init() {
        super.init()
    }
    
    deinit {
        cleanup()
    }
    
    // MARK: - Audio Decoding Implementation
    
    /**
     * Decode audio file to raw PCM samples
     * 
     * This method is called by the C++ base class during extraction.
     * It uses AVAssetReader to decode the audio file into raw PCM samples.
     * 
     * @param path File path to the audio file
     * @returns Vector of interleaved audio samples (normalized to -1.0 to 1.0)
     * @throws std::runtime_error if decoding fails
     */
    public override func decodeAudioData(_ path: String) throws -> [Float] {
        // Validate file path
        guard !path.isEmpty else {
            throw createNSError(
                from: .invalidAudioFile("File path cannot be empty"),
                code: -1
            )
        }
        
        // Create URL from path
        let url = URL(fileURLWithPath: path)
        
        // Check if file exists
        guard FileManager.default.fileExists(atPath: url.path) else {
            throw createNSError(
                from: .fileNotFound(path),
                code: -2
            )
        }
        
        // Create AVAsset
        audioAsset = AVAsset(url: url)
        guard let asset = audioAsset else {
            throw createNSError(
                from: .assetLoadingFailed("Failed to create AVAsset"),
                code: -3
            )
        }
        
        // Get audio tracks
        let audioTracks = asset.tracks(withMediaType: .audio)
        guard let audioTrack = audioTracks.first else {
            throw createNSError(
                from: .invalidAudioFile("No audio track found in file"),
                code: -4
            )
        }
        
        // Create asset reader
        do {
            assetReader = try AVAssetReader(asset: asset)
        } catch {
            throw createNSError(
                from: .assetLoadingFailed("Failed to create AVAssetReader: \(error.localizedDescription)"),
                code: -5
            )
        }
        
        guard let reader = assetReader else {
            throw createNSError(
                from: .assetLoadingFailed("Asset reader is nil"),
                code: -6
            )
        }
        
        // Configure output settings for PCM format
        // Request linear PCM with float samples for easy processing
        let outputSettings: [String: Any] = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVLinearPCMBitDepthKey: 32,
            AVLinearPCMIsFloatKey: true,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false
        ]
        
        // Create asset reader output
        let readerOutput = AVAssetReaderTrackOutput(
            track: audioTrack,
            outputSettings: outputSettings
        )
        
        // Add output to reader
        guard reader.canAdd(readerOutput) else {
            throw createNSError(
                from: .unsupportedFormat("Cannot add output to asset reader. Format may not be supported."),
                code: -7
            )
        }
        
        reader.add(readerOutput)
        
        // Start reading
        guard reader.startReading() else {
            let error = reader.error
            throw createNSError(
                from: .decodingFailed("Failed to start reading: \(error?.localizedDescription ?? "Unknown error")"),
                code: -8
            )
        }
        
        // Read all samples into a buffer
        var audioSamples: [Float] = []
        
        while reader.status == .reading {
            // Check for cancellation
            if isCancelled() {
                reader.cancelReading()
                cleanup()
                throw createNSError(
                    from: .decodingFailed("Decoding cancelled by user"),
                    code: -9
                )
            }
            
            // Read next sample buffer
            guard let sampleBuffer = readerOutput.copyNextSampleBuffer() else {
                break
            }
            
            // Extract audio data from sample buffer
            guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else {
                continue
            }
            
            // Get buffer length
            let length = CMBlockBufferGetDataLength(blockBuffer)
            
            // Allocate memory for audio data
            var data = Data(count: length)
            
            // Copy data from block buffer
            data.withUnsafeMutableBytes { (bytes: UnsafeMutableRawBufferPointer) in
                CMBlockBufferCopyDataBytes(
                    blockBuffer,
                    atOffset: 0,
                    dataLength: length,
                    destination: bytes.baseAddress!
                )
            }
            
            // Convert data to float array
            data.withUnsafeBytes { (bytes: UnsafeRawBufferPointer) in
                let floatBuffer = bytes.bindMemory(to: Float.self)
                audioSamples.append(contentsOf: floatBuffer)
            }
        }
        
        // Check final status
        if reader.status == .failed {
            let error = reader.error
            throw createNSError(
                from: .decodingFailed("Reading failed: \(error?.localizedDescription ?? "Unknown error")"),
                code: -10
            )
        }
        
        // Cleanup
        cleanup()
        
        // Validate we got some data
        guard !audioSamples.isEmpty else {
            throw createNSError(
                from: .decodingFailed("No audio samples decoded from file"),
                code: -11
            )
        }
        
        return audioSamples
    }
    
    // MARK: - Private Helper Methods
    
    /**
     * Clean up resources
     */
    private func cleanup() {
        assetReader?.cancelReading()
        assetReader = nil
        audioAsset = nil
    }
    
    /**
     * Create NSError from WaveformExtractorError
     * 
     * @param error WaveformExtractorError to convert
     * @param code Error code
     * @returns NSError instance
     */
    private func createNSError(from error: WaveformExtractorError, code: Int) -> NSError {
        return NSError(
            domain: "WaveformExtractorSwift",
            code: code,
            userInfo: [
                NSLocalizedDescriptionKey: error.localizedDescription,
                NSLocalizedFailureReasonErrorKey: error.localizedDescription
            ]
        )
    }
}
