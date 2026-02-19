#pragma once

#include <NitroModules/HybridObject.hpp>
#include <vector>
#include <memory>
#include <functional>
#include <future>
#include <atomic>
#include <string>
#include <mutex>

namespace margelo::audiowaveform {

/**
 * Base class for WaveformExtractor Hybrid Object
 * Contains cross-platform waveform processing logic in C++
 * Platform-specific implementations handle audio decoding
 * 
 * This class provides:
 * - Pure virtual methods for platform-specific audio decoding
 * - Thread-safe progress tracking with callback support
 * - Thread-safe cancellation mechanism for long-running extractions
 * - Cross-platform waveform processing and normalization
 * 
 * Thread Safety:
 * - All public methods are thread-safe
 * - Progress updates are atomic and can be called from any thread
 * - Cancellation is atomic and immediately visible to extraction thread
 * - Callbacks are protected by mutex to prevent race conditions
 */
class WaveformExtractorBase : public margelo::nitro::HybridObject {
public:
  virtual ~WaveformExtractorBase() = default;
  
  // Main extraction method
  /**
   * Extract waveform data from an audio file
   * This method runs asynchronously and can be cancelled via cancel()
   * Progress updates are reported through the progress callback
   * 
   * @param config JSON string containing extraction configuration
   * @returns Future that resolves to 2D vector of waveform data (channels x samples)
   * @throws std::runtime_error if extraction fails
   */
  std::future<std::vector<std::vector<float>>> extract(const std::string& config);
  
  // Control methods
  /**
   * Cancel the current extraction operation
   * Thread-safe: can be called from any thread
   * 
   * Behavior:
   * - Sets the atomic cancellation flag to true
   * - Extraction thread checks this flag periodically (every 100 pixels)
   * - When detected, extraction stops immediately and returns empty result
   * - All allocated resources (audio data, waveform buffers) are freed
   * - Progress is reset to 0.0
   * - No more progress callbacks are invoked after cancellation
   * 
   * Cancellation Detection Points:
   * - Before audio decoding starts
   * - After audio decoding completes
   * - During waveform processing (every 100 pixels)
   * - After waveform processing completes
   * - After normalization completes
   * 
   * Maximum Latency:
   * - Cancellation is detected within 100 pixels of processing
   * - For typical audio, this is < 10ms
   * 
   * Thread Safety:
   * - Uses atomic operations with memory_order_release/acquire
   * - Safe to call from any thread at any time
   * - Multiple calls are safe (subsequent calls are no-ops)
   */
  void cancel();
  
  /**
   * Get the current extraction progress
   * Thread-safe: can be called from any thread
   * @returns Progress value between 0.0 (not started) and 1.0 (complete)
   */
  double getProgress() const;
  
  /**
   * Check if extraction is currently cancelled
   * Thread-safe: can be called from any thread
   * @returns true if cancellation was requested, false otherwise
   */
  bool isCancelled() const {
    return cancelled_.load(std::memory_order_acquire);
  }
  
  /**
   * Reset the cancellation flag
   * Thread-safe: can be called from any thread
   * Should be called before starting a new extraction
   */
  void resetCancellation() {
    cancelled_.store(false, std::memory_order_release);
  }
  
  // Callback management
  /**
   * Register a callback for progress updates
   * Thread-safe: can be called from any thread
   * @param callback Function to be called with progress updates (0.0 to 1.0)
   */
  void setProgressCallback(std::function<void(double)> callback) {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    progressCallback_ = std::move(callback);
  }
  
  /**
   * Clear the progress callback
   * Thread-safe: can be called from any thread
   */
  void clearProgressCallback() {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    progressCallback_ = nullptr;
  }
  
  /**
   * Register a callback to be invoked when extraction is complete
   * Thread-safe: can be called from any thread
   * @param callback Function to be called on completion
   */
  void onProgress(const std::function<void(double)>& callback) {
    setProgressCallback(callback);
  }
  
protected:
  // Pure virtual methods - must be implemented by platform-specific code
  
  /**
   * Decode audio file to raw PCM samples
   * Platform-specific implementation (Swift/Kotlin) must implement this
   * 
   * @param path File path to the audio file
   * @returns Vector of interleaved audio samples (normalized to -1.0 to 1.0)
   * @throws std::runtime_error if decoding fails
   */
  virtual std::vector<float> decodeAudioData(const std::string& path) = 0;
  
  // Cross-platform waveform processing
  
  /**
   * Process raw audio data into waveform representation
   * Calculates peak amplitudes for each pixel/sample point
   * 
   * @param audioData Interleaved audio samples
   * @param samplesPerPixel Number of audio samples to process per waveform point
   * @param numChannels Number of audio channels (1 = mono, 2 = stereo)
   * @returns 2D vector of waveform data (channels x waveform points)
   */
  std::vector<std::vector<float>> processWaveform(
    const std::vector<float>& audioData,
    int samplesPerPixel,
    int numChannels
  );
  
  /**
   * Normalize waveform data to a consistent scale
   * Applies threshold filtering and amplitude scaling
   * 
   * @param data Raw waveform data from processWaveform()
   * @param scale Scaling factor to apply (typically 1.0)
   * @param threshold Minimum amplitude threshold (values below are set to 0)
   * @returns Normalized waveform data
   */
  std::vector<std::vector<float>> normalizeWaveform(
    const std::vector<std::vector<float>>& data,
    float scale,
    float threshold
  );
  
  /**
   * Update extraction progress and invoke callback if set
   * Thread-safe: can be called from extraction thread
   * 
   * @param progress Progress value between 0.0 and 1.0
   */
  void updateProgress(double progress);
  
  /**
   * Check if progress callback is currently set
   * Thread-safe: can be called from any thread
   * @returns true if callback is set, false otherwise
   */
  bool hasProgressCallback() const {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    return progressCallback_ != nullptr;
  }
  
  /**
   * Invoke the progress callback if set
   * Thread-safe: can be called from extraction thread
   * @param progress Progress value to report
   */
  void invokeProgressCallback(double progress) {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    if (progressCallback_) {
      progressCallback_(progress);
    }
  }
  
private:
  // Atomic state tracking for thread-safe access
  std::atomic<double> progress_{0.0};
  std::atomic<bool> cancelled_{false};
  
  // Thread-safe callback storage
  std::function<void(double)> progressCallback_;
  mutable std::mutex callbackMutex_;
};

} // namespace margelo::audiowaveform
