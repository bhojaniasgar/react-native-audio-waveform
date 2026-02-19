#include "AudioWaveformFactory.hpp"
#include <unordered_map>
#include <mutex>
#include <stdexcept>

namespace margelo::audiowaveform {

/**
 * Concrete implementation of AudioWaveformFactory
 * Manages lifecycle of AudioRecorder, AudioPlayer, and WaveformExtractor instances
 * 
 * Thread Safety:
 * - All public methods are thread-safe
 * - Instance maps are protected by mutexes
 * - Maximum of 30 concurrent players enforced
 */
class AudioWaveformFactoryImpl : public AudioWaveformFactory {
public:
  AudioWaveformFactoryImpl() = default;
  ~AudioWaveformFactoryImpl() override {
    // Clean up all instances on destruction
    cleanupAllInstances();
  }
  
  // Factory methods
  std::shared_ptr<AudioRecorderBase> createRecorder() override {
    std::lock_guard<std::mutex> lock(recorderMutex_);
    
    // Create platform-specific recorder instance
    // This will be implemented by platform-specific factory subclasses
    auto recorder = createPlatformRecorder();
    
    if (!recorder) {
      throw std::runtime_error("Failed to create AudioRecorder instance");
    }
    
    // Store weak reference for potential cleanup
    recorderInstance_ = recorder;
    
    return recorder;
  }
  
  std::shared_ptr<AudioPlayerBase> createPlayer(const std::string& key) override {
    std::lock_guard<std::mutex> lock(playersMutex_);
    
    // Check if player with this key already exists
    if (players_.find(key) != players_.end()) {
      throw std::runtime_error("Player with key '" + key + "' already exists");
    }
    
    // Enforce maximum player limit (30 concurrent players)
    if (players_.size() >= MAX_PLAYERS) {
      throw std::runtime_error("Maximum number of players (" + 
                               std::to_string(MAX_PLAYERS) + ") reached");
    }
    
    // Create platform-specific player instance
    auto player = createPlatformPlayer(key);
    
    if (!player) {
      throw std::runtime_error("Failed to create AudioPlayer instance for key '" + key + "'");
    }
    
    // Store the player instance
    players_[key] = player;
    
    return player;
  }
  
  std::shared_ptr<WaveformExtractorBase> createExtractor(const std::string& key) override {
    std::lock_guard<std::mutex> lock(extractorsMutex_);
    
    // Check if extractor with this key already exists
    if (extractors_.find(key) != extractors_.end()) {
      throw std::runtime_error("Extractor with key '" + key + "' already exists");
    }
    
    // Create platform-specific extractor instance
    auto extractor = createPlatformExtractor(key);
    
    if (!extractor) {
      throw std::runtime_error("Failed to create WaveformExtractor instance for key '" + key + "'");
    }
    
    // Store the extractor instance
    extractors_[key] = extractor;
    
    return extractor;
  }
  
  // Utility methods
  std::future<bool> stopAllPlayers() override {
    return std::async(std::launch::async, [this]() {
      std::lock_guard<std::mutex> lock(playersMutex_);
      
      bool allStopped = true;
      
      // Stop all players
      for (auto& pair : players_) {
        try {
          auto& player = pair.second;
          if (player && player->isPlaying()) {
            auto stopFuture = player->stop();
            if (stopFuture) {
              // Wait for stop to complete
              auto result = stopFuture->get();
              if (!result) {
                allStopped = false;
              }
            }
          }
        } catch (const std::exception& e) {
          // Log error but continue stopping other players
          allStopped = false;
        }
      }
      
      // Clear all player instances
      players_.clear();
      
      return allStopped;
    });
  }
  
  std::future<bool> stopAllExtractors() override {
    return std::async(std::launch::async, [this]() {
      std::lock_guard<std::mutex> lock(extractorsMutex_);
      
      // Cancel all extractors
      for (auto& pair : extractors_) {
        try {
          auto& extractor = pair.second;
          if (extractor) {
            extractor->cancel();
          }
        } catch (const std::exception& e) {
          // Log error but continue cancelling other extractors
        }
      }
      
      // Clear all extractor instances
      extractors_.clear();
      
      return true;
    });
  }
  
  // Instance management methods
  
  /**
   * Remove a player instance by key
   * Thread-safe: can be called from any thread
   * @param key Player key to remove
   * @returns true if player was found and removed, false otherwise
   */
  bool removePlayer(const std::string& key) {
    std::lock_guard<std::mutex> lock(playersMutex_);
    
    auto it = players_.find(key);
    if (it != players_.end()) {
      players_.erase(it);
      return true;
    }
    
    return false;
  }
  
  /**
   * Remove an extractor instance by key
   * Thread-safe: can be called from any thread
   * @param key Extractor key to remove
   * @returns true if extractor was found and removed, false otherwise
   */
  bool removeExtractor(const std::string& key) {
    std::lock_guard<std::mutex> lock(extractorsMutex_);
    
    auto it = extractors_.find(key);
    if (it != extractors_.end()) {
      extractors_.erase(it);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the number of active players
   * Thread-safe: can be called from any thread
   * @returns Number of active player instances
   */
  size_t getPlayerCount() const {
    std::lock_guard<std::mutex> lock(playersMutex_);
    return players_.size();
  }
  
  /**
   * Get the number of active extractors
   * Thread-safe: can be called from any thread
   * @returns Number of active extractor instances
   */
  size_t getExtractorCount() const {
    std::lock_guard<std::mutex> lock(extractorsMutex_);
    return extractors_.size();
  }
  
  /**
   * Check if a player with the given key exists
   * Thread-safe: can be called from any thread
   * @param key Player key to check
   * @returns true if player exists, false otherwise
   */
  bool hasPlayer(const std::string& key) const {
    std::lock_guard<std::mutex> lock(playersMutex_);
    return players_.find(key) != players_.end();
  }
  
  /**
   * Check if an extractor with the given key exists
   * Thread-safe: can be called from any thread
   * @param key Extractor key to check
   * @returns true if extractor exists, false otherwise
   */
  bool hasExtractor(const std::string& key) const {
    std::lock_guard<std::mutex> lock(extractorsMutex_);
    return extractors_.find(key) != extractors_.end();
  }
  
protected:
  /**
   * Platform-specific factory methods
   * These must be implemented by platform-specific subclasses (iOS/Android)
   */
  
  virtual std::shared_ptr<AudioRecorderBase> createPlatformRecorder() = 0;
  virtual std::shared_ptr<AudioPlayerBase> createPlatformPlayer(const std::string& key) = 0;
  virtual std::shared_ptr<WaveformExtractorBase> createPlatformExtractor(const std::string& key) = 0;
  
private:
  /**
   * Clean up all instances
   * Called during destruction to ensure proper cleanup
   */
  void cleanupAllInstances() {
    // Stop all players
    {
      std::lock_guard<std::mutex> lock(playersMutex_);
      for (auto& pair : players_) {
        try {
          auto& player = pair.second;
          if (player && player->isPlaying()) {
            player->stop();
          }
        } catch (...) {
          // Ignore errors during cleanup
        }
      }
      players_.clear();
    }
    
    // Cancel all extractors
    {
      std::lock_guard<std::mutex> lock(extractorsMutex_);
      for (auto& pair : extractors_) {
        try {
          auto& extractor = pair.second;
          if (extractor) {
            extractor->cancel();
          }
        } catch (...) {
          // Ignore errors during cleanup
        }
      }
      extractors_.clear();
    }
    
    // Clear recorder
    {
      std::lock_guard<std::mutex> lock(recorderMutex_);
      recorderInstance_.reset();
    }
  }
  
  // Constants
  static constexpr size_t MAX_PLAYERS = 30;
  
  // Instance storage
  std::weak_ptr<AudioRecorderBase> recorderInstance_;
  std::unordered_map<std::string, std::shared_ptr<AudioPlayerBase>> players_;
  std::unordered_map<std::string, std::shared_ptr<WaveformExtractorBase>> extractors_;
  
  // Thread safety
  mutable std::mutex recorderMutex_;
  mutable std::mutex playersMutex_;
  mutable std::mutex extractorsMutex_;
};

} // namespace margelo::audiowaveform
