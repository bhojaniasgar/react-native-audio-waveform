#pragma once

#include <NitroModules/HybridObject.hpp>
#include <NitroModules/Promise.hpp>
#include <memory>
#include <functional>
#include <string>
#include <mutex>
#include <atomic>

namespace margelo::audiowaveform {

// Forward declaration for PlayerConfig
namespace margelo::nitro::margelo::audiowaveform {
  struct PlayerConfig;
}

using namespace margelo::nitro;
using margelo::nitro::margelo::audiowaveform::PlayerConfig;

/**
 * Player state enumeration
 * Tracks the current state of the audio player
 */
enum class PlayerState {
  Idle,       // Player created but not prepared
  Prepared,   // Audio file loaded and ready to play
  Playing,    // Currently playing audio
  Paused,     // Playback paused
  Stopped     // Playback stopped, can be restarted
};

/**
 * Base class for AudioPlayer Hybrid Object
 * Platform-specific implementations (Swift/Kotlin) will inherit from this
 * 
 * This class provides:
 * - Pure virtual methods for platform-specific implementation
 * - Thread-safe state management for player lifecycle
 * - Thread-safe callback management for playback updates
 * - Atomic state tracking for concurrent access
 * 
 * Note: This is a custom base class that works alongside the Nitrogen-generated
 * HybridAudioPlayerSpec. Platform implementations should inherit from both
 * the generated spec and this base class to get the thread-safety features.
 */
class AudioPlayerBase : public virtual HybridObject {
public:
  virtual ~AudioPlayerBase() = default;
  
  // Player lifecycle methods - must be implemented by platform
  /**
   * Prepare the audio player with the specified configuration
   * @param config PlayerConfig struct containing playback parameters
   * @returns Promise resolving to true if preparation was successful
   */
  virtual std::shared_ptr<Promise<bool>> prepare(const PlayerConfig& config) = 0;
  
  /**
   * Start or resume audio playback
   * @param finishMode Playback finish mode (0 = stop at end, 1 = loop)
   * @param speed Playback speed multiplier (0.5 = half speed, 2.0 = double speed)
   * @returns Promise resolving to true if playback started successfully
   */
  virtual std::shared_ptr<Promise<bool>> start(int finishMode, double speed) = 0;
  
  /**
   * Pause the current playback
   * @returns Promise resolving to true if paused successfully
   */
  virtual std::shared_ptr<Promise<bool>> pause() = 0;
  
  /**
   * Stop playback and reset to the beginning
   * @returns Promise resolving to true if stopped successfully
   */
  virtual std::shared_ptr<Promise<bool>> stop() = 0;
  
  // Playback control methods - must be implemented by platform
  /**
   * Seek to a specific position in the audio
   * @param position Target position in milliseconds
   * @returns Promise resolving to true if seek was successful
   */
  virtual std::shared_ptr<Promise<bool>> seekTo(double position) = 0;
  
  /**
   * Set the playback volume
   * @param volume Volume level (0.0 = silent, 1.0 = maximum)
   * @returns Promise resolving to true if volume was set successfully
   */
  virtual std::shared_ptr<Promise<bool>> setVolume(double volume) = 0;
  
  /**
   * Set the playback speed
   * @param speed Speed multiplier (0.5 to 2.0 recommended)
   * @returns Promise resolving to true if speed was set successfully
   */
  virtual std::shared_ptr<Promise<bool>> setPlaybackSpeed(double speed) = 0;
  
  // State query methods - must be implemented by platform
  /**
   * Get the duration of the audio file
   * @param durationType Duration type (0 = Current, 1 = Max)
   * @returns Promise resolving to the duration in milliseconds
   */
  virtual std::shared_ptr<Promise<double>> getDuration(int durationType) = 0;
  
  /**
   * Get the current playback position
   * @returns Promise resolving to the current position in milliseconds
   */
  virtual std::shared_ptr<Promise<double>> getCurrentPosition() = 0;
  
  /**
   * Check if the player is currently playing
   * @returns true if audio is currently playing, false otherwise
   */
  virtual bool isPlaying() = 0;
  
  // Callback registration - must be implemented by platform
  /**
   * Register a callback for playback position updates
   * @param callback Function to be called with position updates (in milliseconds)
   */
  virtual void onPlaybackUpdate(const std::function<void(double)>& callback) = 0;
  
  /**
   * Register a callback for playback completion
   * @param callback Function to be called when playback finishes
   */
  virtual void onPlaybackFinished(const std::function<void()>& callback) = 0;
  
  // State management - thread-safe implementation
  /**
   * Get the current player state
   * Thread-safe: can be called from any thread
   * @returns Current PlayerState
   */
  PlayerState getState() const {
    return state_.load(std::memory_order_acquire);
  }
  
  /**
   * Set the player state
   * Thread-safe: can be called from any thread
   * @param newState New PlayerState to set
   */
  void setState(PlayerState newState) {
    state_.store(newState, std::memory_order_release);
  }
  
  /**
   * Check if player is in a valid state for playback operations
   * Thread-safe: can be called from any thread
   * @returns true if player is prepared or in a playback state
   */
  bool isPrepared() const {
    PlayerState currentState = state_.load(std::memory_order_acquire);
    return currentState != PlayerState::Idle;
  }
  
  /**
   * Check if player is in playing state
   * Thread-safe: can be called from any thread
   * @returns true if player is currently playing
   */
  bool isInPlayingState() const {
    return state_.load(std::memory_order_acquire) == PlayerState::Playing;
  }
  
  /**
   * Check if player is in paused state
   * Thread-safe: can be called from any thread
   * @returns true if player is currently paused
   */
  bool isInPausedState() const {
    return state_.load(std::memory_order_acquire) == PlayerState::Paused;
  }
  
  // Callback management - thread-safe implementation
  /**
   * Set callback for playback position updates (internal use)
   * Thread-safe: can be called from any thread
   * @param callback Function to invoke with position updates
   */
  void setPlaybackUpdateCallback(std::function<void(double)> callback) {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    playbackUpdateCallback_ = std::move(callback);
  }
  
  /**
   * Set callback for playback completion (internal use)
   * Thread-safe: can be called from any thread
   * @param callback Function to invoke when playback finishes
   */
  void setPlaybackFinishedCallback(std::function<void()> callback) {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    playbackFinishedCallback_ = std::move(callback);
  }
  
  /**
   * Clear the playback update callback
   * Thread-safe: can be called from any thread
   */
  void clearPlaybackUpdateCallback() {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    playbackUpdateCallback_ = nullptr;
  }
  
  /**
   * Clear the playback finished callback
   * Thread-safe: can be called from any thread
   */
  void clearPlaybackFinishedCallback() {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    playbackFinishedCallback_ = nullptr;
  }
  
protected:
  /**
   * Invoke the playback update callback if set
   * Thread-safe: can be called from platform-specific threads
   * @param position Current playback position in milliseconds
   */
  void invokePlaybackUpdateCallback(double position) {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    if (playbackUpdateCallback_) {
      playbackUpdateCallback_(position);
    }
  }
  
  /**
   * Invoke the playback finished callback if set
   * Thread-safe: can be called from platform-specific threads
   */
  void invokePlaybackFinishedCallback() {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    if (playbackFinishedCallback_) {
      playbackFinishedCallback_();
    }
  }
  
  /**
   * Check if a playback update callback is currently set
   * Thread-safe: can be called from any thread
   * @returns true if callback is set, false otherwise
   */
  bool hasPlaybackUpdateCallback() const {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    return playbackUpdateCallback_ != nullptr;
  }
  
  /**
   * Check if a playback finished callback is currently set
   * Thread-safe: can be called from any thread
   * @returns true if callback is set, false otherwise
   */
  bool hasPlaybackFinishedCallback() const {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    return playbackFinishedCallback_ != nullptr;
  }
  
  // Thread-safe callback storage
  std::function<void(double)> playbackUpdateCallback_;
  std::function<void()> playbackFinishedCallback_;
  mutable std::mutex callbackMutex_;
  
  // Atomic state tracking for player lifecycle
  std::atomic<PlayerState> state_{PlayerState::Idle};
  
  // Additional state tracking
  std::atomic<double> currentVolume_{1.0};
  std::atomic<double> currentSpeed_{1.0};
};

} // namespace margelo::audiowaveform
