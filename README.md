
<!-- ![Audio Waveform](./assets/react_native_audiowave.gif) -->

# react-native-audio-waveform

[![react-native-audio-waveform on npm](https://img.shields.io/npm/v/@asgar-dev/react-native-audio-waveform.svg?\&logo=npm\&logoColor=white\&color=red\&labelColor=grey\&cacheSeconds=3600\&maxAge=86400)](https://www.npmjs.com/package/@asgar-dev/react-native-audio-waveform) [![react-native-audio-waveform downloads](https://img.shields.io/npm/dm/@asgar-dev/react-native-audio-waveform?\&logo=npm\&logoColor=white\&color=blue\&labelColor=grey\&cacheSeconds=3600\&maxAge=86400)](https://www.npmtrends.com/@asgar-dev/react-native-audio-waveform) [![react-native-audio-waveform install size](https://packagephobia.com/badge?p=@asgar-dev/react-native-audio-waveform\&icon=disk\&logoColor=white\&color=yellow\&labelColor=grey\&cacheSeconds=3600\&maxAge=86400)](https://packagephobia.com/result?p=@asgar-dev/react-native-audio-waveform) [![Android](https://img.shields.io/badge/Platform-Android-green?logo=android\&logoColor=white\&labelColor=grey)](https://www.android.com) [![iOS](https://img.shields.io/badge/Platform-iOS-green?logo=apple\&logoColor=white\&labelColor=grey)](https://developer.apple.com/ios) [![MIT](https://img.shields.io/badge/License-MIT-green\&labelColor=grey)](https://opensource.org/licenses/MIT)

---

A React Native module to **generate and render audio waveforms** using native modules. Supports both static waveform visualization for pre-recorded audio and real-time waveform during audio recording.

---

<!-- ## 🎬 Preview

| Audio Playback                           | Live Record                          | Playback with Speed                              |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| ![Playback](./assets/audio_playback.gif) | ![Record](./assets/audio_record.gif) | ![Speed](./assets/audio_playback_with_speed.gif) | -->

---

## Quick Access

* [Installation](#installation)
* [Usage](#usage)
* [Props](#properties)
* [Examples](#example)
* [License](#license)

---

## 🔧 Installation

```sh
npm install @asgar-dev/react-native-audio-waveform react-native-gesture-handler
# or
yarn add @asgar-dev/react-native-audio-waveform react-native-gesture-handler
```

### iOS Setup

```sh
npx pod-install
```

Add the following permission to `Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Needed permission to record audio</string>
```

### Android Setup

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## 🚀 Usage

### Static waveform for pre-recorded audio

```tsx
<Waveform
  mode="static"
  ref={ref}
  path={audioPath}
  candleSpace={2}
  candleWidth={4}
  scrubColor="white"
  onPlayerStateChange={playerState => console.log(playerState)}
/>
```

### Live waveform during recording

```tsx
<Waveform
  mode="live"
  ref={ref}
  candleSpace={2}
  candleWidth={4}
  onRecorderStateChange={recorderState => console.log(recorderState)}
/>
```

See full usage in [example](./example/src/App.tsx).

---

## 📘 Properties

> Refer to the full list in the original README above or the [documentation](./docs/PROPS.md) if separated.

---

## 📦 Example Setup

```bash
cd example
npx react-native-asset
yarn
yarn example ios     # For iOS
yarn example android # For Android
```

> Delete `link-assets-manifest.json` before running the asset command if it already exists.

---

## 🙌 Like this project?

Give it a ⭐ on GitHub to support my work.

---

## 🛠 Contributions

Pull requests are welcome! For major changes, please open an issue first.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## 🐞 Issues / Features

Use [GitHub Issues](https://github.com/bhojaniasgar/react-native-audio-waveform/issues) to report bugs, request features, or share feedback.

<!-- --- -->

<!-- ## 📝 License

MIT © 2024 [Asgar](https://github.com/asgar-dev) -->


