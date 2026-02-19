#include "WaveformExtractorBase.hpp"
#include "WaveformProcessor.hpp"
#include <stdexcept>

namespace margelo::audiowaveform {

std::future<std::vector<std::vector<float>>> WaveformExtractorBase::extract(
  const std::string& config
) {
  return std::async(std::launch::async, [this, config]() {
    // Reset state for new extraction
    resetCancellation();
    progress_.store(0.0, std::memory_order_release);
    
    try {
      // Update progress: Starting
      updateProgress(0.1);
      
      // Check for cancellation before starting
      if (isCancelled()) {
        updateProgress(0.0);
        return std::vector<std::vector<float>>{};
      }
      
      // Platform-specific audio decoding
      std::vector<float> audioData = decodeAudioData(config);
      
      // Check for cancellation after decoding
      // Clear audioData to free memory if cancelled
      if (isCancelled()) {
        audioData.clear();
        audioData.shrink_to_fit();
        updateProgress(0.0);
        return std::vector<std::vector<float>>{};
      }
      
      updateProgress(0.5);
      
      // TODO: Parse config to extract parameters
      // For now, using default values
      int samplesPerPixel = 100;
      int numChannels = 2;
      
      // Cross-platform waveform processing
      auto waveform = processWaveform(audioData, samplesPerPixel, numChannels);
      
      // Clear audioData after processing to free memory
      audioData.clear();
      audioData.shrink_to_fit();
      
      // Check for cancellation after processing
      // Clear waveform to free memory if cancelled
      if (isCancelled()) {
        waveform.clear();
        waveform.shrink_to_fit();
        updateProgress(0.0);
        return std::vector<std::vector<float>>{};
      }
      
      updateProgress(0.8);
      
      // TODO: Parse normalization parameters from config
      bool normalize = true;
      float scale = 1.0f;
      float threshold = 0.0f;
      
      if (normalize) {
        waveform = normalizeWaveform(waveform, scale, threshold);
      }
      
      // Final cancellation check
      // Clear waveform to free memory if cancelled
      if (isCancelled()) {
        waveform.clear();
        waveform.shrink_to_fit();
        updateProgress(0.0);
        return std::vector<std::vector<float>>{};
      }
      
      updateProgress(1.0);
      
      return waveform;
      
    } catch (const std::exception& e) {
      // Reset progress on error
      progress_.store(0.0, std::memory_order_release);
      throw;
    }
  });
}

void WaveformExtractorBase::cancel() {
  cancelled_.store(true, std::memory_order_release);
  // Note: Progress is not reset here to allow checking final progress
  // The extraction thread will reset progress when it detects cancellation
}

double WaveformExtractorBase::getProgress() const {
  return progress_.load(std::memory_order_acquire);
}

void WaveformExtractorBase::updateProgress(double progress) {
  // Clamp progress to valid range [0.0, 1.0]
  if (progress < 0.0) progress = 0.0;
  if (progress > 1.0) progress = 1.0;
  
  progress_.store(progress, std::memory_order_release);
  
  // Invoke callback if set (thread-safe)
  invokeProgressCallback(progress);
}

std::vector<std::vector<float>> WaveformExtractorBase::processWaveform(
  const std::vector<float>& audioData,
  int samplesPerPixel,
  int numChannels
) {
  // Create a progress callback that maps processor progress (0.0-1.0) 
  // to the extraction progress range (0.5-0.8)
  auto progressMapper = [this](double processorProgress) {
    // Map processor progress to the 0.5-0.8 range of overall extraction
    double mappedProgress = 0.5 + (processorProgress * 0.3);
    updateProgress(mappedProgress);
  };
  
  return WaveformProcessor::processWaveform(
    audioData, 
    samplesPerPixel, 
    numChannels,
    progressMapper,
    &cancelled_
  );
}

std::vector<std::vector<float>> WaveformExtractorBase::normalizeWaveform(
  const std::vector<std::vector<float>>& data,
  float scale,
  float threshold
) {
  return WaveformProcessor::normalizeWaveform(data, scale, threshold);
}

} // namespace margelo::audiowaveform
