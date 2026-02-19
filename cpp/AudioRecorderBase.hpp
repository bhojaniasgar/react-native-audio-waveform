#pragma once

#include <NitroModules/HybridObject.hpp>
#include <NitroModules/Promise.hpp>
#include <memory>
#include <functional>
#include <string>
#include <mutex>
#include <atomic>

namespace margelo::audiowaveform {

// Forward declaration for RecordingConfig
namespace margelo::nitro::margelo::audiowaveform {
  struct RecordingConfig;
}

using namespace margelo::nitro;
using margelo::nitro::margelo::audiowaveform::RecordingConfig;

/**
 * Base class for AudioRecorder Hybrid Object
 * Platform-specific implementations (Swift/Kotlin) will inherit from this
 * 
 * This class provides:
 * - Pure virtual methods for platform-specific implementation
 * - Thread-safe callback management for real-time decibel updates
 * - Atomic state tracking for recording status
 * 
 * Note: This is a custom base class that works alongside the Nitrogen-generated
 * HybridAudioRecorderSpec. Platform implementations should inherit from both
 * the generated spec and this base class to get the thread-safety features.
 */
class AudioRecorderBase : public virtual HybridObject {
public:
  virtual ~AudioRecorderBase() = default;
  
  // Permission methods - must be implemented by platform
  /**
   * Check if audio recording permission is granted
   * @returns Promise resolving to "granted", "denied", or "undetermined"
   */
  virtual std::shared_ptr<Promise<std::string>> checkHasPermission() = 0;
  
  /**
   * Request audio recording permission from user
   * @returns Promise resolving to permission status after request
   */
  virtual std::shared_ptr<Promise<std::string>> getPermission() = 0;
  
  // Recording control methods - must be implemented by platform
  /**
   * Start audio recording with given configuration
   * @param config RecordingConfig struct containing recording parameters
   * @returns Promise resolving to true if recording started successfully
   */
  virtual std::shared_ptr<Promise<bool>> startRecording(const RecordingConfig& config) = 0;
  
  /**
   * Stop current recording and finalize audio file
   * @returns Promise resolving to file path of recorded audio
   */
  virtual std::shared_ptr<Promise<std::string>> stopRecording() = 0;
  
  /**
   * Pause current recording
   * @returns Promise resolving to true if paused successfully
   */
  virtual std::shared_ptr<Promise<bool>> pauseRecording() = 0;
  
  /**
   * Resume paused recording
   * @returns Promise resolving to true if resumed successfully
   */
  virtual std::shared_ptr<Promise<bool>> resumeRecording() = 0;
  
  // Real-time monitoring - must be implemented by platform
  /**
   * Get current decibel level snapshot
   * @returns Promise resolving to current decibel level (-160 to 0 dB)
   */
  virtual std::shared_ptr<Promise<double>> getDecibel() = 0;
  
  /**
   * Register callback for real-time decibel updates
   * @param callback Function to invoke with decibel updates
   */
  virtual void onDecibelUpdate(const std::function<void(double)>& callback) = 0;
  
  // Callback management - thread-safe implementation
  /**
   * Set callback for real-time decibel updates (internal use)
   * Thread-safe: can be called from any thread
   * @param callback Function to invoke with decibel updates
   */
  void setDecibelCallback(std::function<void(double)> callback) {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    decibelCallback_ = std::move(callback);
  }
  
  /**
   * Clear the decibel callback
   * Thread-safe: can be called from any thread
   */
  void clearDecibelCallback() {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    decibelCallback_ = nullptr;
  }
  
protected:
  /**
   * Invoke the decibel callback if set
   * Thread-safe: can be called from platform-specific threads
   * @param decibel Current decibel level to report
   */
  void invokeDecibelCallback(double decibel) {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    if (decibelCallback_) {
      decibelCallback_(decibel);
    }
  }
  
  /**
   * Check if a decibel callback is currently set
   * Thread-safe: can be called from any thread
   * @returns true if callback is set, false otherwise
   */
  bool hasDecibelCallback() const {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    return decibelCallback_ != nullptr;
  }
  
  // Thread-safe callback storage
  std::function<void(double)> decibelCallback_;
  mutable std::mutex callbackMutex_;
  
  // Atomic state tracking for recording status
  std::atomic<bool> isRecording_{false};
  std::atomic<bool> isPaused_{false};
};

} // namespace margelo::audiowaveform
