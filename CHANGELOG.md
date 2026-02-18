# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.5] - 2025-02-18

### Fixed
- Fixed compatibility with latest React Native versions (0.76+)
- Updated `currentActivity` references to use `reactApplicationContext.currentActivity` for proper context handling
- Resolved deprecation warnings in Android module

### Changed
- Improved stability and performance in Android audio recording
- Better context management in AudioWaveformModule

## [1.0.4] - Previous Release

### Added
- Initial stable release with audio recording and playback features
- Waveform visualization components
- TypeScript support
- iOS and Android platform support
