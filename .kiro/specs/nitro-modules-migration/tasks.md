# Tasks: Nitro Modules Migration

## Phase 1: Foundation Setup

### 1. Project Configuration
- [x] 1.1 Install react-native-nitro-modules dependency
  - Add to package.json
  - Run npm install
  - Verify installation
- [x] 1.2 Install Nitrogen code generator
  - Add as dev dependency
  - Configure generation scripts
  - Test code generation
- [x] 1.3 Update iOS project configuration
  - Update Podfile for Nitro support
  - Set minimum iOS version to 13.0
  - Enable Swift <> C++ interop flags
  - Run pod install
- [x] 1.4 Update Android project configuration
  - Update build.gradle for Nitro support
  - Set minimum API level to 21
  - Configure CMake for C++ compilation
  - Add fbjni dependency
- [x] 1.5 Create C++ directory structure
  - Create cpp/ directory
  - Set up include paths
  - Create namespace structure

### 2. TypeScript Interface Definitions
- [x] 2.1 Create AudioRecorder.nitro.ts spec
  - Define interface with all methods
  - Define RecordingConfig type
  - Add JSDoc comments
- [x] 2.2 Create AudioPlayer.nitro.ts spec
  - Define interface with all methods
  - Define PlayerConfig type
  - Define enums (DurationType, UpdateFrequency)
  - Add JSDoc comments
- [x] 2.3 Create WaveformExtractor.nitro.ts spec
  - Define interface with all methods
  - Define ExtractionConfig type
  - Add JSDoc comments
- [x] 2.4 Create AudioWaveform.nitro.ts factory spec
  - Define factory methods
  - Define utility methods
  - Add JSDoc comments
- [x] 2.5 Generate native bindings with Nitrogen
  - Run code generator
  - Verify generated C++ headers
  - Verify generated Swift/Kotlin stubs
  - Commit generated code

## Phase 2: C++ Base Implementation

### 3. Core C++ Classes
- [x] 3.1 Implement AudioRecorderBase.hpp
  - Define pure virtual methods
  - Implement callback management
  - Add thread safety
- [x] 3.2 Implement AudioPlayerBase.hpp
  - Define pure virtual methods
  - Implement state management
  - Add callback management
- [x] 3.3 Implement WaveformExtractorBase.hpp
  - Define pure virtual methods
  - Implement progress tracking
  - Add cancellation support
- [x] 3.4 Implement AudioWaveformFactory.cpp
  - Implement factory methods
  - Add instance management
  - Implement cleanup methods

### 4. Waveform Processing Optimization
- [x] 4.1 Implement WaveformProcessor.cpp
  - Implement processWaveform() with parallel processing
  - Optimize for multi-core CPUs
  - Add SIMD optimizations if available
- [x] 4.2 Implement normalizeWaveform()
  - Port normalization algorithm to C++
  - Ensure identical results to current implementation
  - Optimize for performance
- [x] 4.3 Add progress reporting
  - Implement thread-safe progress updates
  - Add callback mechanism
  - Test with large files
- [x] 4.4 Add cancellation support
  - Implement atomic cancellation flag
  - Clean up resources on cancel
  - Test cancellation at various stages

## Phase 3: iOS Swift Implementation

### 5. AudioRecorder Swift Implementation
- [x] 5.1 Create AudioRecorderSwift.swift
  - Inherit from AudioRecorderBase
  - Set up AVAudioSession
  - Implement permission methods
- [x] 5.2 Implement recording methods
  - Implement startRecording()
  - Implement stopRecording()
  - Implement pauseRecording()
  - Implement resumeRecording()
- [x] 5.3 Implement real-time monitoring
  - Set up metering timer
  - Implement getDecibel()
  - Connect to C++ callback
  - Test latency
- [x] 5.4 Add error handling
  - Handle AVAudioSession errors
  - Handle file system errors
  - Provide meaningful error messages

### 6. AudioPlayer Swift Implementation
- [x] 6.1 Create AudioPlayerSwift.swift
  - Inherit from AudioPlayerBase
  - Set up AVAudioPlayer
  - Implement prepare()
- [x] 6.2 Implement playback control
  - Implement start()
  - Implement pause()
  - Implement stop()
  - Implement seekTo()
- [x] 6.3 Implement audio properties
  - Implement setVolume()
  - Implement setPlaybackSpeed()
  - Implement getDuration()
  - Implement getCurrentPosition()
- [x] 6.4 Implement callbacks
  - Set up playback update timer
  - Implement onPlaybackUpdate callback
  - Implement onPlaybackFinished callback
  - Test callback performance

### 7. WaveformExtractor Swift Implementation
- [x] 7.1 Create WaveformExtractorSwift.swift
  - Inherit from WaveformExtractorBase
  - Set up AVAssetReader
  - Implement decodeAudioData()
- [x] 7.2 Integrate with C++ processor
  - Pass decoded data to C++ layer
  - Receive processed waveform
  - Handle progress callbacks
- [x] 7.3 Add error handling
  - Handle asset loading errors
  - Handle decoding errors
  - Provide meaningful error messages
- [x] 7.4 Test with various audio formats
  - Test with M4A files
  - Test with MP3 files
  - Test with WAV files
  - Test with large files (1+ hour)

## Phase 4: Android Kotlin Implementation

### 8. AudioRecorder Kotlin Implementation
- [x] 8.1 Create AudioRecorderKotlin.kt
  - Inherit from AudioRecorderBase
  - Set up MediaRecorder
  - Implement permission methods
- [x] 8.2 Implement recording methods
  - Implement startRecording()
  - Implement stopRecording()
  - Implement pauseRecording()
  - Implement resumeRecording()
- [x] 8.3 Implement real-time monitoring
  - Set up Handler for metering
  - Implement getDecibel()
  - Connect to C++ callback via JNI
  - Test latency
- [x] 8.4 Add error handling
  - Handle MediaRecorder errors
  - Handle file system errors
  - Provide meaningful error messages

### 9. AudioPlayer Kotlin Implementation
- [x] 9.1 Create AudioPlayerKotlin.kt
  - Inherit from AudioPlayerBase
  - Set up AudioTrack
  - Implement prepare()
- [x] 9.2 Implement playback control
  - Implement start()
  - Implement pause()
  - Implement stop()
  - Implement seekTo()
- [x] 9.3 Implement audio properties
  - Implement setVolume()
  - Implement setPlaybackSpeed()
  - Implement getDuration()
  - Implement getCurrentPosition()
- [x] 9.4 Implement callbacks
  - Set up playback update handler
  - Implement onPlaybackUpdate callback
  - Implement onPlaybackFinished callback
  - Test callback performance

### 10. WaveformExtractor Kotlin Implementation
- [x] 10.1 Create WaveformExtractorKotlin.kt
  - Inherit from WaveformExtractorBase
  - Set up MediaExtractor and MediaCodec
  - Implement decodeAudioData()
- [x] 10.2 Integrate with C++ processor
  - Pass decoded data to C++ layer via JNI
  - Receive processed waveform
  - Handle progress callbacks
- [x] 10.3 Add error handling
  - Handle MediaExtractor errors
  - Handle MediaCodec errors
  - Provide meaningful error messages
- [x] 10.4 Test with various audio formats
  - Test with M4A files
  - Test with MP3 files
  - Test with WAV files
  - Test with large files (1+ hour)

## Phase 5: JavaScript Integration

### 11. Update JavaScript Entry Point
- [x] 11.1 Update src/AudioWaveform.ts
  - Import NitroModules
  - Create Hybrid Object instances
  - Remove NativeModules usage
- [x] 11.2 Create backward compatibility layer
  - Detect Nitro availability
  - Fallback to legacy if needed
  - Add deprecation warnings
- [x] 11.3 Update hooks (useAudioRecorder, useAudioPlayer)
  - Update to use Nitro callbacks
  - Remove event emitter usage
  - Maintain API compatibility
- [x] 11.4 Update React components
  - Update Waveform component
  - Update WaveformCandle component
  - Test rendering performance

### 12. Type Definitions
- [x] 12.1 Generate TypeScript definitions
  - Run Nitrogen type generator
  - Verify completeness
  - Add to package exports
- [x] 12.2 Update existing type files
  - Update AudioWaveformTypes.ts
  - Ensure compatibility
  - Add new types as needed
- [x] 12.3 Test TypeScript compilation
  - Run tsc
  - Fix any type errors
  - Verify IDE autocomplete

## Phase 6: Testing

### 13. Unit Tests
- [x] 13.1 Test AudioRecorder
  - Test permission methods
  - Test recording lifecycle
  - Test error handling
  - Test callback mechanisms
- [x] 13.2 Test AudioPlayer
  - Test player lifecycle
  - Test playback control
  - Test audio properties
  - Test multiple concurrent players
- [x] 13.3 Test WaveformExtractor
  - Test extraction accuracy
  - Test progress reporting
  - Test cancellation
  - Test error handling
- [x] 13.4 Test C++ waveform processing
  - Test processWaveform() correctness
  - Test normalizeWaveform() correctness
  - Test parallel processing
  - Test edge cases (empty, single sample, etc.)

### 14. Integration Tests
- [x] 14.1 Test complete workflows
  - Test record → extract → play
  - Test multiple concurrent operations
  - Test cleanup and resource management
- [x] 14.2 Test platform-specific behavior
  - Test on iOS devices
  - Test on Android devices
  - Test on various OS versions
- [x] 14.3 Test error scenarios
  - Test with invalid file paths
  - Test with corrupted audio files
  - Test with insufficient permissions
  - Test with low memory conditions

### 15. Performance Tests
- [x] 15.1 Benchmark native method calls
  - Measure call overhead
  - Compare with legacy bridge
  - Verify 10x improvement
- [x] 15.2 Benchmark waveform extraction
  - Test with various file sizes
  - Compare with legacy implementation
  - Verify 3x improvement
- [x] 15.3 Benchmark real-time monitoring
  - Measure callback latency
  - Test under load
  - Verify < 50ms latency
- [x] 15.4 Memory profiling
  - Profile memory usage during extraction
  - Test for memory leaks
  - Verify stable memory usage

### 16. Property-Based Tests
- [x] 16.1 Write property: Type safety
  - Test all methods return correct types
  - Test with arbitrary inputs
  - Verify compile-time guarantees
- [x] 16.2 Write property: Performance improvement
  - Test native call performance
  - Test extraction performance
  - Verify improvements hold across inputs
- [x] 16.3 Write property: Waveform consistency
  - Test extraction produces same results
  - Allow for floating point tolerance
  - Test with various audio files
- [x] 16.4 Write property: Memory safety
  - Test memory usage remains stable
  - Test with many operations
  - Verify cleanup works correctly
- [x] 16.5 Write property: Concurrent operations
  - Test multiple players work correctly
  - Test multiple extractors work correctly
  - Verify no race conditions

## Phase 7: Documentation

### 17. API Documentation
- [x] 17.1 Generate API docs from TypeScript
  - Set up documentation generator
  - Generate HTML docs
  - Review for completeness
- [x] 17.2 Write usage examples
  - Basic recording example
  - Basic playback example
  - Waveform extraction example
  - Advanced usage patterns
- [x] 17.3 Document performance characteristics
  - Document performance improvements
  - Document memory usage
  - Document best practices
- [x] 17.4 Create troubleshooting guide
  - Common issues and solutions
  - Platform-specific issues
  - Debugging tips

### 18. Migration Guide
- [x] 18.1 Write migration overview
  - Explain benefits of migration
  - List breaking changes
  - Provide timeline
- [~] 18.2 Write step-by-step migration
  - Installation steps
  - Code changes needed
  - Testing recommendations
- [~] 18.3 Create before/after examples
  - Show API changes
  - Show performance improvements
  - Show type safety improvements
- [~] 18.4 Document rollback procedure
  - How to revert if needed
  - Version pinning
  - Support timeline

### 19. Example App Updates
- [~] 19.1 Update example app to use Nitro
  - Update dependencies
  - Update code
  - Test on iOS
  - Test on Android
- [~] 19.2 Add performance comparison demo
  - Show side-by-side comparison
  - Display timing metrics
  - Visualize improvements
- [~] 19.3 Add new feature demos
  - Demo improved real-time monitoring
  - Demo faster extraction
  - Demo type safety

## Phase 8: Release Preparation

### 20. CI/CD Updates
- [~] 20.1 Update build pipeline
  - Add C++ compilation
  - Add Nitrogen generation step
  - Update test commands
- [~] 20.2 Add performance benchmarks to CI
  - Run benchmarks on each PR
  - Track performance over time
  - Alert on regressions
- [~] 20.3 Add platform-specific tests
  - Test on iOS simulator
  - Test on Android emulator
  - Test on physical devices (if available)
- [~] 20.4 Update release scripts
  - Update version bumping
  - Update changelog generation
  - Update npm publish

### 21. Beta Release
- [~] 21.1 Prepare beta release
  - Create release branch
  - Update version to 2.0.0-beta.1
  - Generate changelog
- [~] 21.2 Publish beta to npm
  - Tag as beta
  - Publish to npm
  - Announce to community
- [~] 21.3 Gather feedback
  - Monitor GitHub issues
  - Engage with beta testers
  - Track performance reports
- [~] 21.4 Fix critical issues
  - Prioritize bug fixes
  - Release beta.2, beta.3 as needed
  - Update documentation

### 22. Stable Release
- [~] 22.1 Prepare stable release
  - Finalize changelog
  - Update version to 2.0.0
  - Tag release
- [~] 22.2 Publish to npm
  - Publish as latest
  - Update documentation site
  - Announce release
- [~] 22.3 Monitor adoption
  - Track download metrics
  - Monitor issue reports
  - Provide migration support
- [~] 22.4 Plan deprecation of legacy code
  - Set deprecation timeline
  - Communicate to users
  - Plan removal for v3.0.0

## Optional Enhancements

### 23. Additional Optimizations*
- [ ]* 23.1 Add SIMD optimizations for waveform processing
  - Use platform-specific SIMD instructions
  - Benchmark improvements
  - Ensure correctness
- [ ]* 23.2 Implement audio streaming for large files
  - Stream instead of loading entire file
  - Reduce memory usage
  - Maintain performance
- [ ]* 23.3 Add caching for extracted waveforms
  - Cache to disk
  - Implement cache invalidation
  - Add cache management API

### 24. Advanced Features*
- [ ]* 24.1 Add audio effects support
  - Equalizer
  - Reverb
  - Pitch shifting
- [ ]* 24.2 Add visualization customization
  - Custom color schemes
  - Custom rendering styles
  - Animation options
- [ ]* 24.3 Add export functionality
  - Export waveform as image
  - Export audio with effects
  - Export to various formats

## Notes

- Tasks marked with * are optional enhancements
- Each task should be completed and tested before moving to the next
- Performance benchmarks should be run after each major component
- Documentation should be updated as features are implemented
- Beta testing should involve real-world usage scenarios
