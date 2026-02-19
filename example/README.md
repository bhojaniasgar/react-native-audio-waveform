# Usage Examples

This directory contains comprehensive examples demonstrating how to use the react-native-audio-waveform library with Nitro Modules.

## Available Examples

### Basic Examples

1. **[BasicRecordingExample.tsx](./BasicRecordingExample.tsx)**
   - Simple audio recording using hooks
   - Record, pause, resume, and stop functionality
   - Perfect starting point for recording features

2. **[BasicPlaybackExample.tsx](./BasicPlaybackExample.tsx)**
   - Simple audio playback using hooks
   - Play, pause, stop, and seek controls
   - Time display and progress tracking

3. **[WaveformExtractionExample.tsx](./WaveformExtractionExample.tsx)**
   - Extract waveform data from audio files
   - Progress tracking and cancellation
   - Waveform visualization

### Advanced Examples

4. **[AdvancedUsageExample.tsx](./AdvancedUsageExample.tsx)**
   - Complete record → extract → playback workflow
   - Real-time audio monitoring with animated visualization
   - Custom configuration and error handling
   - Multiple concurrent operations

5. **[BackwardCompatibilityExample.tsx](./BackwardCompatibilityExample.tsx)**
   - Nitro Modules detection and status checking
   - Graceful degradation patterns
   - Performance benchmarking
   - Migration helpers

## Documentation

For detailed documentation and more examples, see:

- **[Usage Examples Guide](../docs/USAGE_EXAMPLES.md)** - Comprehensive guide with all patterns
- **[API Documentation](../docs/api/index.html)** - Complete API reference
- **[README](../README.md)** - Quick start and installation

## Running Examples

To use these examples in your app:

1. Copy the example file to your project
2. Update the audio file paths to match your files
3. Import and use the component in your app

```typescript
import BasicRecordingExample from './examples/BasicRecordingExample';

function App() {
  return <BasicRecordingExample />;
}
```

## Example Categories

### Recording
- Basic recording with hooks
- Custom recording configuration
- Real-time audio monitoring
- Permission handling

### Playback
- Basic playback with hooks
- Custom player configuration
- Volume and speed control
- Multiple concurrent players

### Waveform Extraction
- Basic extraction
- Progress tracking
- Batch extraction
- Visualization

### Advanced Patterns
- Complete workflows
- Error handling
- Performance optimization
- Concurrent operations

## TypeScript Support

All examples are written in TypeScript and demonstrate:
- Full type safety
- Proper type imports
- Type-safe configuration
- IDE autocomplete support

## Need Help?

If you have questions or need additional examples:

1. Check the [Usage Examples Guide](../docs/USAGE_EXAMPLES.md)
2. Review the [API Documentation](../docs/api/index.html)
3. Search [GitHub Issues](https://github.com/bhojaniasgar/react-native-audio-waveform/issues)
4. Create a new issue with your question

---

**Note**: All examples use Nitro Modules (v2.0+). For legacy examples, see the v1.x branch.
