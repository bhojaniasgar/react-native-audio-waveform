#include "WaveformProcessor.hpp"
#include <algorithm>
#include <cmath>
#include <thread>
#include <future>
#include <vector>
#include <atomic>

// SIMD support detection
#if defined(__ARM_NEON) || defined(__ARM_NEON__)
  #include <arm_neon.h>
  #define HAS_NEON 1
#elif defined(__SSE2__) || (defined(_M_IX86_FP) && _M_IX86_FP >= 2)
  #include <emmintrin.h>
  #define HAS_SSE2 1
#endif

namespace margelo::audiowaveform {

// SIMD-optimized max absolute value finder for ARM NEON
#ifdef HAS_NEON
static inline float findMaxAbsNeon(const float* data, size_t count) {
  if (count == 0) return 0.0f;
  
  float32x4_t maxVec = vdupq_n_f32(0.0f);
  size_t i = 0;
  
  // Process 4 floats at a time
  for (; i + 4 <= count; i += 4) {
    float32x4_t vec = vld1q_f32(data + i);
    vec = vabsq_f32(vec);
    maxVec = vmaxq_f32(maxVec, vec);
  }
  
  // Reduce vector to single max value
  float32x2_t max2 = vmax_f32(vget_low_f32(maxVec), vget_high_f32(maxVec));
  float32x2_t max1 = vpmax_f32(max2, max2);
  float maxVal = vget_lane_f32(max1, 0);
  
  // Handle remaining elements
  for (; i < count; ++i) {
    maxVal = std::max(maxVal, std::abs(data[i]));
  }
  
  return maxVal;
}
#endif

// SIMD-optimized max absolute value finder for x86 SSE2
#ifdef HAS_SSE2
static inline float findMaxAbsSSE2(const float* data, size_t count) {
  if (count == 0) return 0.0f;
  
  __m128 maxVec = _mm_setzero_ps();
  __m128 signMask = _mm_castsi128_ps(_mm_set1_epi32(0x7FFFFFFF));
  size_t i = 0;
  
  // Process 4 floats at a time
  for (; i + 4 <= count; i += 4) {
    __m128 vec = _mm_loadu_ps(data + i);
    vec = _mm_and_ps(vec, signMask); // Absolute value
    maxVec = _mm_max_ps(maxVec, vec);
  }
  
  // Reduce vector to single max value
  float result[4];
  _mm_storeu_ps(result, maxVec);
  float maxVal = std::max(std::max(result[0], result[1]), 
                          std::max(result[2], result[3]));
  
  // Handle remaining elements
  for (; i < count; ++i) {
    maxVal = std::max(maxVal, std::abs(data[i]));
  }
  
  return maxVal;
}
#endif

// Fallback scalar implementation
static inline float findMaxAbsScalar(const float* data, size_t count) {
  float maxVal = 0.0f;
  for (size_t i = 0; i < count; ++i) {
    maxVal = std::max(maxVal, std::abs(data[i]));
  }
  return maxVal;
}

// Unified interface that selects best available implementation
static inline float findMaxAbs(const float* data, size_t count) {
#ifdef HAS_NEON
  return findMaxAbsNeon(data, count);
#elif defined(HAS_SSE2)
  return findMaxAbsSSE2(data, count);
#else
  return findMaxAbsScalar(data, count);
#endif
}

std::vector<std::vector<float>> WaveformProcessor::processWaveform(
  const std::vector<float>& audioData,
  int samplesPerPixel,
  int numChannels,
  const std::function<void(double)>& progressCallback,
  const std::atomic<bool>* cancellationFlag
) {
  if (audioData.empty() || samplesPerPixel <= 0 || numChannels <= 0) {
    return {};
  }
  
  const size_t totalSamples = audioData.size();
  const size_t numPixels = totalSamples / samplesPerPixel / numChannels;
  
  if (numPixels == 0) {
    return {};
  }
  
  // Initialize result vector
  std::vector<std::vector<float>> result(numChannels, 
    std::vector<float>(numPixels, 0.0f));
  
  // Thread-safe progress tracking
  std::atomic<size_t> pixelsProcessed{0};
  
  // Helper to report progress safely
  auto reportProgress = [&](size_t processed) {
    if (progressCallback) {
      double progress = static_cast<double>(processed) / static_cast<double>(numPixels);
      progressCallback(progress);
    }
  };
  
  // Helper to check cancellation
  auto isCancelled = [&]() {
    return cancellationFlag && cancellationFlag->load(std::memory_order_acquire);
  };
  
  // Use parallel processing for better performance
  const size_t numThreads = std::min(
    static_cast<size_t>(std::thread::hardware_concurrency()),
    numPixels
  );
  
  if (numThreads <= 1) {
    // Single-threaded processing for small workloads
    for (size_t pixel = 0; pixel < numPixels; ++pixel) {
      // Check for cancellation periodically
      if (pixel % 100 == 0 && isCancelled()) {
        return {};
      }
      
      for (int channel = 0; channel < numChannels; ++channel) {
        const size_t startSample = pixel * samplesPerPixel * numChannels + channel;
        const size_t endSample = std::min(
          startSample + samplesPerPixel * numChannels,
          totalSamples
        );
        
        // Use SIMD-optimized max finding when processing strided data
        float maxAmplitude = 0.0f;
        for (size_t i = startSample; i < endSample; i += numChannels) {
          maxAmplitude = std::max(maxAmplitude, std::abs(audioData[i]));
        }
        
        result[channel][pixel] = maxAmplitude;
      }
      
      // Report progress every 10% or every 1000 pixels
      if (pixel % std::max(numPixels / 10, size_t(1)) == 0 || 
          pixel % 1000 == 0) {
        reportProgress(pixel + 1);
      }
    }
    
    // Report final progress
    reportProgress(numPixels);
  } else {
    // Multi-threaded processing
    const size_t pixelsPerThread = (numPixels + numThreads - 1) / numThreads;
    std::vector<std::future<void>> futures;
    
    for (size_t t = 0; t < numThreads; ++t) {
      futures.push_back(std::async(std::launch::async, [&, t]() {
        const size_t startPixel = t * pixelsPerThread;
        const size_t endPixel = std::min(startPixel + pixelsPerThread, numPixels);
        
        for (size_t pixel = startPixel; pixel < endPixel; ++pixel) {
          // Check for cancellation periodically
          if (pixel % 100 == 0 && isCancelled()) {
            return;
          }
          
          for (int channel = 0; channel < numChannels; ++channel) {
            const size_t startSample = pixel * samplesPerPixel * numChannels + channel;
            const size_t endSample = std::min(
              startSample + samplesPerPixel * numChannels,
              totalSamples
            );
            
            // For mono audio or when processing contiguous blocks, use SIMD
            if (numChannels == 1) {
              // Contiguous data - can use SIMD efficiently
              const size_t count = endSample - startSample;
              result[channel][pixel] = findMaxAbs(&audioData[startSample], count);
            } else {
              // Strided data - use scalar loop
              float maxAmplitude = 0.0f;
              for (size_t i = startSample; i < endSample; i += numChannels) {
                maxAmplitude = std::max(maxAmplitude, std::abs(audioData[i]));
              }
              result[channel][pixel] = maxAmplitude;
            }
          }
          
          // Update atomic counter and report progress periodically
          size_t processed = pixelsProcessed.fetch_add(1, std::memory_order_relaxed) + 1;
          
          // Report progress every 5% or every 500 pixels (less frequent in multi-threaded)
          if (processed % std::max(numPixels / 20, size_t(1)) == 0 || 
              processed % 500 == 0) {
            reportProgress(processed);
          }
        }
      }));
    }
    
    // Wait for all threads to complete
    for (auto& future : futures) {
      future.wait();
    }
    
    // Check if cancelled after all threads complete
    if (isCancelled()) {
      return {};
    }
    
    // Report final progress
    reportProgress(numPixels);
  }
  
  return result;
}

std::vector<std::vector<float>> WaveformProcessor::normalizeWaveform(
  const std::vector<std::vector<float>>& data,
  float scale,
  float threshold
) {
  if (data.empty()) {
    return {};
  }
  
  std::vector<std::vector<float>> normalized;
  normalized.reserve(data.size());
  
  for (const auto& channelData : data) {
    if (channelData.empty()) {
      normalized.push_back({});
      continue;
    }
    
    // Find max amplitude above threshold
    float maxAmplitude = 0.0f;
    for (float sample : channelData) {
      if (std::abs(sample) >= threshold) {
        maxAmplitude = std::max(maxAmplitude, std::abs(sample));
      }
    }
    
    // Normalize channel
    std::vector<float> normalizedChannel;
    normalizedChannel.reserve(channelData.size());
    
    if (maxAmplitude > 0.0f) {
      for (float sample : channelData) {
        if (std::abs(sample) < threshold) {
          normalizedChannel.push_back(0.0f);
        } else {
          normalizedChannel.push_back((sample / maxAmplitude) * scale);
        }
      }
    } else {
      // No samples above threshold, return zeros
      normalizedChannel.assign(channelData.size(), 0.0f);
    }
    
    normalized.push_back(std::move(normalizedChannel));
  }
  
  return normalized;
}

} // namespace margelo::audiowaveform
