# 🎵 React Native Audio Waveform

[![npm version](https://img.shields.io/npm/v/@bhojaniasgar/react-native-audio-waveform)](https://www.npmjs.com/package/@bhojaniasgar/react-native-audio-waveform)
[![npm downloads](https://img.shields.io/npm/dm/@bhojaniasgar/react-native-audio-waveform)](https://www.npmjs.com/package/@bhojaniasgar/react-native-audio-waveform)
[![License](https://img.shields.io/github/license/bhojaniasgar/react-native-audio-waveform)](https://github.com/bhojaniasgar/react-native-audio-waveform/blob/main/LICENSE)

A React Native component to show audio waveform with ease in react native applications. Perfect for audio chat, voice messages, and audio visualization.

## ✨ Features

- 🎙️ Audio recording with real-time waveform visualization
- ▶️ Audio playback with waveform display
- 📊 Real-time waveform generation
- 🎨 Customizable waveform appearance
- 📱 Support for both iOS and Android
- 💪 TypeScript support
- 🚀 Easy to integrate
- ⚡ High performance

## 📦 Installation

```bash
npm install @bhojaniasgar/react-native-audio-waveform
# or
yarn add @bhojaniasgar/react-native-audio-waveform
```

### iOS

```bash
cd ios && pod install
```

### Android

No additional steps required.

## 🚀 Quick Start

### Recording Audio

```tsx
import { useAudioRecorder } from '@bhojaniasgar/react-native-audio-waveform';

function RecordingComponent() {
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
  } = useAudioRecorder();

  return (
    <View>
      <Button
        title={isRecording ? 'Stop' : 'Record'}
        onPress={isRecording ? stopRecording : startRecording}
      />
    </View>
  );
}
```

### Playing Audio with Waveform

```tsx
import { Waveform, useAudioPlayer } from '@bhojaniasgar/react-native-audio-waveform';

function PlayerComponent() {
  const { play, pause, stop } = useAudioPlayer();

  return (
    <View>
      <Waveform
        path={audioPath}
        candleSpace={2}
        candleWidth={4}
        waveColor="#667eea"
        scrubColor="#764ba2"
      />
      <Button title="Play" onPress={play} />
    </View>
  );
}
```

## Website
  https://bhojaniasgar.github.io/react-native-audio-waveform/
## 📖 API Documentation 

### Hooks

#### `useAudioRecorder()`

Hook for audio recording functionality.

**Returns:**
- `startRecording()` - Start recording audio
- `stopRecording()` - Stop recording and save
- `pauseRecording()` - Pause recording (Android 7.0+)
- `resumeRecording()` - Resume paused recording
- `isRecording` - Boolean indicating recording state

#### `useAudioPlayer()`

Hook for audio playback functionality.

**Returns:**
- `play()` - Start playback
- `pause()` - Pause playback
- `stop()` - Stop playback
- `seekTo(position)` - Seek to position
- `setVolume(volume)` - Set playback volume
- `isPlaying` - Boolean indicating playback state

### Components

#### `<Waveform />`

Display audio waveform.

**Props:**
- `path` (string) - Path to audio file
- `candleSpace` (number) - Space between waveform bars
- `candleWidth` (number) - Width of waveform bars
- `waveColor` (string) - Color of waveform
- `scrubColor` (string) - Color of playback progress

#### `<WaveformCandle />`

Alternative waveform visualization with candle-style bars.

## 🔧 Configuration

### Permissions

#### iOS

Add to your `Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to record audio</string>
```

#### Android

Add to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## 🛠️ Development

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run linter
npm run lint

# Run tests
npm test
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Asgar Bhojani**

- GitHub: [@bhojaniasgar](https://github.com/bhojaniasgar)
- NPM: [@bhojaniasgar](https://www.npmjs.com/~bhojaniasgar)

## 🙏 Acknowledgments

- Thanks to all contributors who have helped this project grow
- Inspired by the need for better audio visualization in React Native

## 📞 Support

- 🐛 [Report a bug](https://github.com/bhojaniasgar/react-native-audio-waveform/issues)
- 💡 [Request a feature](https://github.com/bhojaniasgar/react-native-audio-waveform/issues)
- 📖 [Documentation](https://bhojaniasgar.github.io/react-native-audio-waveform/)

---

Made with ❤️ by [Asgar Bhojani](https://github.com/bhojaniasgar)
