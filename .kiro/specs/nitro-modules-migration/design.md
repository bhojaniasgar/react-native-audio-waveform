# Design: Nitro Modules Migration

## Architecture Overview

### Current Architecture
```
JavaScript Layer (src/AudioWaveform.ts)
         ↓ (NativeModules Bridge - High Overhead)
Native Layer (Swift/Kotlin)
```

### Target Architecture
```
TypeScript Layer (Hybrid Object Interfaces)
         ↓ (Nitrogen Generated Bindings)
C++ Layer (JSI Direct Access - Zero Overhead)
         ↓ (Swift <> C++ / Kotlin <> C++ Interop)
Platform Layer (Swift/Kotlin Implementations)
```

## Component Design

### 1. TypeScript Interface Definitions

#### 1.1 AudioRecorder Hybrid Object
```typescript
// specs/AudioRecorder.nitro.ts
export interface AudioRecorder extends HybridObject {
  // Permission methods
  checkHasPermission(): Promise<string>
  getPermission(): Promise<string>
  
  // Recording control
  startRecording(config: RecordingConfig): Promise<boolean>
  stopRecording(): Promise<string>
  pauseRecording(): Promise<boolean>
  resumeRecording(): Promise<boolean>
  
  // Real-time monitoring
  getDecibel(): Promise<number>
  onDecibelUpdate(callback: (decibel: number) => void): void
}

export interface RecordingConfig {
  path?: string
  encoder?: number
  sampleRate?: number
  bitRate?: number
  fileNameFormat?: string
  useLegacyNormalization?: boolean
}
```

#### 1.2 AudioPlayer Hybrid Object
```typescript
// specs/AudioPlayer.nitro.ts
export interface AudioPlayer extends HybridObject {
  // Player lifecycle
  prepare(config: PlayerConfig): Promise<boolean>
  start(finishMode: number, speed: number): Promise<boolean>
  pause(): Promise<boolean>
  stop(): Promise<boolean>
  
  // Playback control
  seekTo(position: number): Promise<boolean>
  setVolume(volume: number): Promise<boolean>
  setPlaybackSpeed(speed: number): Promise<boolean>
  
  // State queries
  getDuration(type: DurationType): Promise<number>
  getCurrentPosition(): Promise<number>
  isPlaying(): boolean
  
  // Event callbacks
  onPlaybackUpdate(callback: (position: number) => void): void
  onPlaybackFinished(callback: () => void): void
}

export interface PlayerConfig {
  path: string
  volume?: number
  updateFrequency?: UpdateFrequency
  startPosition?: number
}

export enum DurationType {
  Current = 0,
  Max = 1
}

export enum UpdateFrequency {
  Low = 0,
  Medium = 1,
  High = 2
}
```

#### 1.3 WaveformExtractor Hybrid Object
```typescript
// specs/WaveformExtractor.nitro.ts
export interface WaveformExtractor extends HybridObject {
  // Extraction methods
  extract(config: ExtractionConfig): Promise<number[][]>
  cancel(): void
  
  // Progress monitoring
  onProgress(callback: (progress: number) => void): void
  getProgress(): number
}

export interface ExtractionConfig {
  path: string
  samplesPerPixel: number
  normalize?: boolean
  scale?: number
  threshold?: number
}
```

#### 1.4 AudioWaveform Factory
```typescript
// specs/AudioWaveform.nitro.ts
export interface AudioWaveform extends HybridObject {
  // Factory methods
  createRecorder(): AudioRecorder
  createPlayer(key: string): AudioPlayer
  createExtractor(key: string): WaveformExtractor
  
  // Utility methods
  stopAllPlayers(): Promise<boolean>
  stopAllExtractors(): Promise<boolean>
}
```

### 2. C++ Base Implementation

#### 2.1 Core C++ Classes
```cpp
// cpp/AudioRecorderBase.hpp
#pragma once
#include <NitroModules/HybridObject.hpp>
#include <memory>
#include <functional>

namespace margelo::nitro::audiowaveform {

class AudioRecorderBase : public HybridObject {
public:
  virtual ~AudioRecorderBase() = default;
  
  // Pure virtual methods to be implemented by platform
  virtual std::future<std::string> checkHasPermission() = 0;
  virtual std::future<std::string> getPermission() = 0;
  virtual std::future<bool> startRecording(const RecordingConfig& config) = 0;
  virtual std::future<std::string> stopRecording() = 0;
  virtual std::future<bool> pauseRecording() = 0;
  virtual std::future<bool> resumeRecording() = 0;
  virtual std::future<double> getDecibel() = 0;
  
  // Callback management
  void setDecibelCallback(std::function<void(double)> callback);
  
protected:
  std::function<void(double)> decibelCallback_;
};

} // namespace
```

```cpp
// cpp/WaveformExtractorBase.hpp
#pragma once
#include <NitroModules/HybridObject.hpp>
#include <vector>
#include <memory>

namespace margelo::nitro::audiowaveform {

class WaveformExtractorBase : public HybridObject {
public:
  virtual ~WaveformExtractorBase() = default;
  
  // Cross-platform extraction logic
  std::future<std::vector<std::vector<float>>> extract(
    const ExtractionConfig& config
  );
  
  void cancel();
  double getProgress() const;
  void setProgressCallback(std::function<void(double)> callback);
  
protected:
  // Platform-specific audio decoding
  virtual std::vector<float> decodeAudioData(const std::string& path) = 0;
  
  // Cross-platform processing
  std::vector<std::vector<float>> processWaveform(
    const std::vector<float>& audioData,
    int samplesPerPixel
  );
  
  std::vector<std::vector<float>> normalizeWaveform(
    const std::vector<std::vector<float>>& data,
    float scale,
    float threshold
  );
  
private:
  std::atomic<double> progress_{0.0};
  std::atomic<bool> cancelled_{false};
  std::function<void(double)> progressCallback_;
};

} // namespace
```

### 3. Platform-Specific Implementations

#### 3.1 iOS Swift Implementation
```swift
// ios/AudioRecorderSwift.swift
import Foundation
import AVFoundation
import NitroModules

public class AudioRecorderSwift: AudioRecorderBase {
  private var audioRecorder: AVAudioRecorder?
  private var meteringTimer: Timer?
  
  public override func checkHasPermission() -> Promise<String> {
    return Promise { resolve, reject in
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
  
  public override func startRecording(config: RecordingConfig) -> Promise<Bool> {
    return Promise { resolve, reject in
      // Implementation using AVAudioRecorder
      // Direct callback to C++ layer via decibelCallback_
    }
  }
  
  // ... other methods
}
```

#### 3.2 Android Kotlin Implementation
```kotlin
// android/AudioRecorderKotlin.kt
package com.audiowaveform.nitro

import android.media.MediaRecorder
import com.margelo.nitro.HybridObject
import com.margelo.nitro.Promise

class AudioRecorderKotlin : AudioRecorderBase() {
  private var mediaRecorder: MediaRecorder? = null
  private var meteringHandler: Handler? = null
  
  override fun checkHasPermission(): Promise<String> {
    return Promise { resolve, reject ->
      val permission = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.RECORD_AUDIO
      )
      when (permission) {
        PackageManager.PERMISSION_GRANTED -> resolve("granted")
        else -> resolve("denied")
      }
    }
  }
  
  override fun startRecording(config: RecordingConfig): Promise<Boolean> {
    return Promise { resolve, reject ->
      // Implementation using MediaRecorder
      // Direct callback to C++ layer via decibelCallback_
    }
  }
  
  // ... other methods
}
```

### 4. Waveform Processing Optimization

#### 4.1 C++ Optimized Extraction
```cpp
// cpp/WaveformProcessor.cpp
#include "WaveformProcessor.hpp"
#include <algorithm>
#include <cmath>
#include <thread>
#include <future>

namespace margelo::nitro::audiowaveform {

std::vector<std::vector<float>> WaveformProcessor::processWaveform(
  const std::vector<float>& audioData,
  int samplesPerPixel,
  int numChannels
) {
  const size_t totalSamples = audioData.size();
  const size_t numPixels = totalSamples / samplesPerPixel / numChannels;
  
  std::vector<std::vector<float>> result(numChannels, 
    std::vector<float>(numPixels, 0.0f));
  
  // Parallel processing for better performance
  const size_t numThreads = std::thread::hardware_concurrency();
  const size_t pixelsPerThread = numPixels / numThreads;
  
  std::vector<std::future<void>> futures;
  
  for (size_t t = 0; t < numThreads; ++t) {
    futures.push_back(std::async(std::launch::async, [&, t]() {
      const size_t startPixel = t * pixelsPerThread;
      const size_t endPixel = (t == numThreads - 1) ? 
        numPixels : (t + 1) * pixelsPerThread;
      
      for (size_t pixel = startPixel; pixel < endPixel; ++pixel) {
        for (int channel = 0; channel < numChannels; ++channel) {
          float maxAmplitude = 0.0f;
          
          const size_t startSample = pixel * samplesPerPixel * numChannels + channel;
          const size_t endSample = startSample + samplesPerPixel * numChannels;
          
          for (size_t i = startSample; i < endSample && i < totalSamples; 
               i += numChannels) {
            maxAmplitude = std::max(maxAmplitude, std::abs(audioData[i]));
          }
          
          result[channel][pixel] = maxAmplitude;
        }
      }
    }));
  }
  
  // Wait for all threads to complete
  for (auto& future : futures) {
    future.wait();
  }
  
  return result;
}

std::vector<std::vector<float>> WaveformProcessor::normalizeWaveform(
  const std::vector<std::vector<float>>& data,
  float scale,
  float threshold
) {
  std::vector<std::vector<float>> normalized;
  normalized.reserve(data.size());
  
  for (const auto& channelData : data) {
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
      normalizedChannel = channelData;
    }
    
    normalized.push_back(std::move(normalizedChannel));
  }
  
  return normalized;
}

} // namespace
```

### 5. Build Configuration

#### 5.1 iOS Configuration
```ruby
# react-native-audio-waveform.podspec
Pod::Spec.new do |s|
  s.name         = "react-native-audio-waveform"
  s.version      = "2.0.0"
  s.summary      = "Audio waveform with Nitro Modules"
  
  s.homepage     = "https://github.com/bhojaniasgar/react-native-audio-waveform"
  s.license      = "MIT"
  s.author       = { "Asgar Bhojani" => "asgar@example.com" }
  s.platform     = :ios, "13.0"
  
  s.source       = { :git => "https://github.com/bhojaniasgar/react-native-audio-waveform.git", :tag => "v#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,swift}", "cpp/**/*.{hpp,cpp}"
  
  s.dependency "React-Core"
  s.dependency "NitroModules"
  
  # Enable Swift <> C++ interop
  s.pod_target_xcconfig = {
    'SWIFT_VERSION' => '5.9',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'CLANG_ENABLE_MODULES' => 'YES',
    'SWIFT_OBJC_INTEROP_MODE' => 'objcxx'
  }
end
```

#### 5.2 Android Configuration
```gradle
// android/build.gradle
android {
    compileSdkVersion 33
    
    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 33
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_11
        targetCompatibility JavaVersion.VERSION_11
    }
    
    kotlinOptions {
        jvmTarget = '11'
    }
    
    externalNativeBuild {
        cmake {
            path "CMakeLists.txt"
        }
    }
    
    ndkVersion "25.1.8937393"
}

dependencies {
    implementation 'com.facebook.react:react-native:+'
    implementation 'com.margelo.nitro:nitro-modules:+'
    implementation 'com.facebook.fbjni:fbjni:+'
}
```

```cmake
# android/CMakeLists.txt
cmake_minimum_required(VERSION 3.18)
project(AudioWaveformNitro)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add C++ source files
file(GLOB_RECURSE CPP_SOURCES "../cpp/**/*.cpp")

add_library(
  audiowaveform-nitro
  SHARED
  ${CPP_SOURCES}
  src/main/cpp/AudioWaveformModule.cpp
)

target_include_directories(
  audiowaveform-nitro
  PRIVATE
  "../cpp"
  "${NODE_MODULES_DIR}/react-native-nitro-modules/cpp"
)

target_link_libraries(
  audiowaveform-nitro
  android
  log
  fbjni
  react_nativemodule_core
)
```

### 6. Migration Strategy

#### 6.1 Backward Compatibility Layer
```typescript
// src/AudioWaveform.ts
import { NitroModules } from 'react-native-nitro-modules'
import type { AudioWaveform as AudioWaveformNitro } from './specs/AudioWaveform.nitro'

// Try to load Nitro module, fallback to legacy
let AudioWaveformModule: AudioWaveformNitro | null = null

try {
  AudioWaveformModule = NitroModules.createHybridObject<AudioWaveformNitro>(
    'AudioWaveform'
  )
} catch (e) {
  console.warn('Nitro Modules not available, using legacy bridge')
}

// Export unified API
export const AudioWaveform = AudioWaveformModule || LegacyAudioWaveform
```

#### 6.2 Gradual Migration Path
1. Phase 1: Install Nitro infrastructure alongside existing code
2. Phase 2: Migrate one component at a time (Recorder → Player → Extractor)
3. Phase 3: Run both implementations in parallel with feature flag
4. Phase 4: Deprecate legacy implementation
5. Phase 5: Remove legacy code in next major version

### 7. Testing Strategy

#### 7.1 Unit Tests
- Test each Hybrid Object independently
- Mock platform-specific dependencies
- Verify type safety and null safety
- Test error handling

#### 7.2 Integration Tests
- Test complete workflows (record → extract → play)
- Test multiple concurrent operations
- Test memory management and cleanup
- Test callback mechanisms

#### 7.3 Performance Tests
```typescript
// __tests__/performance.test.ts
describe('Nitro Performance', () => {
  it('should call native methods faster than bridge', async () => {
    const iterations = 100000
    
    // Nitro timing
    const nitroStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      await audioRecorder.getDecibel()
    }
    const nitroTime = performance.now() - nitroStart
    
    // Should be at least 10x faster
    expect(nitroTime).toBeLessThan(legacyTime / 10)
  })
  
  it('should extract waveforms 3x faster', async () => {
    const testFile = 'test-audio-60s.m4a'
    
    const nitroStart = performance.now()
    await extractor.extract({ path: testFile, samplesPerPixel: 100 })
    const nitroTime = performance.now() - nitroStart
    
    expect(nitroTime).toBeLessThan(legacyTime / 3)
  })
})
```

### 8. Documentation Updates

#### 8.1 API Documentation
- Generate from TypeScript interfaces
- Include performance characteristics
- Document migration path
- Provide code examples

#### 8.2 Migration Guide
```markdown
# Migration Guide: v1.x to v2.0 (Nitro)

## Installation
```bash
npm install @bhojaniasgar/react-native-audio-waveform@2.0.0
npm install react-native-nitro-modules
```

## Breaking Changes
- Minimum iOS version: 13.0
- Minimum Android API: 21
- Minimum React Native: 0.71.0

## API Changes
Most APIs remain the same. Key differences:
- Callbacks now use direct JSI instead of event emitters
- Improved type safety may catch previously hidden bugs
- Performance improvements may change timing assumptions

## Testing Your Migration
1. Run existing test suite
2. Verify performance improvements
3. Test on physical devices
4. Monitor memory usage
```

## Correctness Properties

### Property 1: Type Safety
**Validates: Requirements 1.2, 5.1**
```typescript
property('All native methods match TypeScript signatures', () => {
  // This is enforced at compile time by Nitrogen
  // Runtime validation for edge cases
  forAll(arbitrary.recordingConfig(), (config) => {
    const result = audioRecorder.startRecording(config)
    return result instanceof Promise
  })
})
```

### Property 2: Performance Improvement
**Validates: Requirements 2.2, 3.2, 4.1, 6.1**
```typescript
property('Native calls are at least 10x faster', () => {
  forAll(arbitrary.positiveInteger(), async (iterations) => {
    const nitroTime = await measureNitroCalls(iterations)
    const bridgeTime = await measureBridgeCalls(iterations)
    return nitroTime < bridgeTime / 10
  })
})
```

### Property 3: Waveform Consistency
**Validates: Requirements 4.1**
```typescript
property('Waveform extraction produces consistent results', () => {
  forAll(arbitrary.audioFile(), async (audioFile) => {
    const nitroResult = await nitroExtractor.extract(audioFile)
    const legacyResult = await legacyExtractor.extract(audioFile)
    return arraysEqual(nitroResult, legacyResult, 0.001) // Allow small floating point differences
  })
})
```

### Property 4: Memory Safety
**Validates: Requirements 4.2, 6.1**
```typescript
property('Memory usage remains stable', () => {
  forAll(arbitrary.array(arbitrary.audioFile()), async (files) => {
    const initialMemory = getMemoryUsage()
    
    for (const file of files) {
      await extractor.extract(file)
    }
    
    // Force garbage collection
    global.gc()
    
    const finalMemory = getMemoryUsage()
    const memoryIncrease = finalMemory - initialMemory
    
    return memoryIncrease < initialMemory * 0.1 // Less than 10% increase
  })
})
```

### Property 5: Concurrent Operations
**Validates: Requirements 3.1, 4.2**
```typescript
property('Multiple concurrent operations work correctly', () => {
  forAll(
    arbitrary.array(arbitrary.playerConfig(), { minLength: 1, maxLength: 30 }),
    async (configs) => {
      const players = configs.map(config => 
        audioWaveform.createPlayer(config.key)
      )
      
      const results = await Promise.all(
        players.map(player => player.prepare(config))
      )
      
      return results.every(result => result === true)
    }
  )
})
```

## Risk Mitigation

### Technical Risks
1. **Swift <> C++ interop issues**: Extensive testing on multiple iOS versions
2. **Kotlin <> C++ interop issues**: Comprehensive Android device testing
3. **Memory leaks**: Automated memory profiling in CI
4. **Performance regressions**: Benchmark suite in CI

### Process Risks
1. **Breaking changes**: Maintain compatibility layer, semantic versioning
2. **Documentation gaps**: Generate docs from code, peer review
3. **Community adoption**: Beta program, migration support

## Success Criteria

### Performance Metrics
- [ ] Native method calls < 1ms overhead
- [ ] Waveform extraction 3x faster
- [ ] Real-time monitoring latency < 50ms
- [ ] Memory usage stable or improved

### Quality Metrics
- [ ] All existing tests pass
- [ ] New performance tests added
- [ ] Type safety at 100%
- [ ] Zero critical bugs in beta

### Documentation Metrics
- [ ] API docs complete
- [ ] Migration guide published
- [ ] Example app updated
- [ ] Troubleshooting guide available
