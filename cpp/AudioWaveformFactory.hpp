#pragma once

#include <NitroModules/HybridObject.hpp>
#include <memory>
#include <string>
#include <future>
#include "AudioRecorderBase.hpp"
#include "AudioPlayerBase.hpp"
#include "WaveformExtractorBase.hpp"

namespace margelo::audiowaveform {

/**
 * Factory class for creating AudioWaveform Hybrid Objects
 * Main entry point for the Nitro Module
 */
class AudioWaveformFactory : public margelo::nitro::HybridObject {
public:
  virtual ~AudioWaveformFactory() = default;
  
  // Factory methods for creating instances
  virtual std::shared_ptr<AudioRecorderBase> createRecorder() = 0;
  virtual std::shared_ptr<AudioPlayerBase> createPlayer(const std::string& key) = 0;
  virtual std::shared_ptr<WaveformExtractorBase> createExtractor(const std::string& key) = 0;
  
  // Utility methods
  virtual std::future<bool> stopAllPlayers() = 0;
  virtual std::future<bool> stopAllExtractors() = 0;
};

} // namespace margelo::audiowaveform
