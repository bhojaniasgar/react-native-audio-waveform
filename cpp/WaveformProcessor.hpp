#pragma once

#include <vector>
#include <cstddef>
#include <functional>
#include <atomic>

namespace margelo::audiowaveform {

/**
 * Optimized waveform processing utilities
 * Uses multi-threading and SIMD when available for performance
 * 
 * Performance Optimizations:
 * - Multi-threaded processing using std::async for large datasets
 * - ARM NEON SIMD intrinsics on ARM devices (iOS/Android ARM)
 * - x86 SSE2 SIMD intrinsics on x86 devices
 * - Automatic fallback to scalar implementation when SIMD unavailable
 * - Single-threaded path for small workloads to avoid thread overhead
 * 
 * SIMD optimizations provide ~4x speedup for mono audio processing
 * by processing 4 float values per instruction. Multi-threading scales
 * with CPU core count for additional performance gains.
 * 
 * Thread Safety:
 * - Progress callbacks are thread-safe and can be invoked from worker threads
 * - Cancellation checks are atomic and thread-safe
 */
class WaveformProcessor {
public:
  /**
   * Process raw audio data into waveform samples
   * Uses parallel processing for better performance
   * 
   * @param audioData Raw audio samples
   * @param samplesPerPixel Number of audio samples per waveform pixel
   * @param numChannels Number of audio channels (1 for mono, 2 for stereo)
   * @param progressCallback Optional callback for progress updates (0.0 to 1.0)
   * @param cancellationFlag Optional atomic flag to check for cancellation
   * @return 2D vector [channel][pixel] containing max amplitudes
   */
  static std::vector<std::vector<float>> processWaveform(
    const std::vector<float>& audioData,
    int samplesPerPixel,
    int numChannels,
    const std::function<void(double)>& progressCallback = nullptr,
    const std::atomic<bool>* cancellationFlag = nullptr
  );
  
  /**
   * Normalize waveform data
   * 
   * @param data Input waveform data [channel][pixel]
   * @param scale Scale factor for normalization
   * @param threshold Minimum amplitude threshold
   * @return Normalized waveform data
   */
  static std::vector<std::vector<float>> normalizeWaveform(
    const std::vector<std::vector<float>>& data,
    float scale,
    float threshold
  );
};

} // namespace margelo::audiowaveform
