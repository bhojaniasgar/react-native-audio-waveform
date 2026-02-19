# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when using react-native-audio-waveform with Nitro Modules (v2.0+).

## Table of Contents

- [Installation Issues](#installation-issues)
- [Build Issues](#build-issues)
- [Runtime Issues](#runtime-issues)
- [Permission Issues](#permission-issues)
- [Recording Issues](#recording-issues)
- [Playback Issues](#playback-issues)
- [Waveform Extraction Issues](#waveform-extraction-issues)
- [Performance Issues](#performance-issues)
- [Platform-Specific Issues](#platform-specific-issues)
- [Debugging Tips](#debugging-tips)

---

## Installation Issues

### Issue: "Cannot find module 'react-native-nitro-modules'"

**Symptoms:**
- Build fails with module not found error
- TypeScript errors about missing types

**Solutions:**

1. **Install Nitro Modules dependency:**
```bash
npm install react-native-nitro-modules
# or
yarn add react-native-nitro-modules
```

2. **Clear cache and reinstall:**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Clear yarn cache
yarn cache clean
rm -rf node_modules yarn.lock
yarn install
```

3. **Verify installation:**
```bash
npm list react-native-nitro-modules
```


### Issue: "Pod install fails on iOS"

**Symptoms:**
- `pod install` command fails
- CocoaPods errors about dependencies
- Swift version conflicts

**Solutions:**

1. **Update CocoaPods:**
```bash
sudo gem install cocoapods
pod repo update
```

2. **Clean and reinstall pods:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod deintegrate
pod install
```

3. **Check minimum iOS version:**
Ensure your `Podfile` has minimum iOS 13.0:
```ruby
platform :ios, '13.0'
```

4. **Verify Swift version:**
Nitro Modules requires Swift 5.9+. Check Xcode version (14.0+).

5. **Clear derived data:**
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

---

## Build Issues

### Issue: iOS Build Fails with Swift Errors

**Symptoms:**
- Build fails with Swift compilation errors
- "No such module 'NitroModules'" error
- Swift <> C++ interop errors

**Solutions:**

1. **Verify Xcode version:**
- Minimum: Xcode 14.0
- Recommended: Xcode 15.0+
- Check: `xcodebuild -version`

2. **Check Swift version in Podfile:**
```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_VERSION'] = '5.9'
    end
  end
end
```


3. **Clean build folder:**
```bash
cd ios
xcodebuild clean
rm -rf build
```

4. **Rebuild from Xcode:**
- Open `.xcworkspace` in Xcode
- Product → Clean Build Folder (Cmd+Shift+K)
- Product → Build (Cmd+B)

### Issue: Android Build Fails with CMake Errors

**Symptoms:**
- Gradle build fails
- CMake configuration errors
- NDK not found errors
- C++ compilation errors

**Solutions:**

1. **Install NDK:**
Open Android Studio → SDK Manager → SDK Tools → Install NDK (version 25.1.8937393 or higher)

2. **Set NDK path in `local.properties`:**
```properties
ndk.dir=/Users/yourname/Library/Android/sdk/ndk/25.1.8937393
```

3. **Verify CMake version:**
Minimum CMake 3.18 required. Check `android/build.gradle`:
```gradle
android {
    externalNativeBuild {
        cmake {
            version "3.18.1"
        }
    }
}
```

4. **Clean Gradle cache:**
```bash
cd android
./gradlew clean
rm -rf .gradle build
./gradlew build
```

5. **Check minimum SDK version:**
Ensure `minSdkVersion` is 21 or higher in `android/build.gradle`:
```gradle
android {
    defaultConfig {
        minSdkVersion 21
    }
}
```


### Issue: "Nitro Modules not available" at Runtime

**Symptoms:**
- App runs but Nitro features don't work
- Error: "NitroModules.createHybridObject is not a function"
- Falls back to legacy implementation

**Solutions:**

1. **Check React Native version:**
```bash
npm list react-native
```
Minimum required: 0.71.0

2. **Verify Nitro installation:**
```typescript
import { NitroModules } from 'react-native-nitro-modules';

console.log('Nitro available:', typeof NitroModules.createHybridObject === 'function');
```

3. **Rebuild native code:**
```bash
# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

4. **Check for multiple React Native versions:**
```bash
npm ls react-native
```
Ensure only one version is installed.

---

## Runtime Issues

### Issue: "Cannot create recorder/player/extractor"

**Symptoms:**
- `AudioWaveform.createRecorder()` returns null
- `AudioWaveform.createPlayer()` throws error
- Native module not found

**Solutions:**

1. **Verify native module is linked:**
```typescript
import { NitroModules } from 'react-native-nitro-modules';

try {
  const audioWaveform = NitroModules.createHybridObject('AudioWaveform');
  console.log('AudioWaveform module loaded:', !!audioWaveform);
} catch (error) {
  console.error('Failed to load AudioWaveform:', error);
}
```


2. **Rebuild app completely:**
```bash
# Clear all caches
rm -rf node_modules
npm install

# iOS
cd ios
rm -rf Pods Podfile.lock build
pod install
cd ..
npx react-native run-ios

# Android
cd android
./gradlew clean
cd ..
npx react-native run-android
```

3. **Check for autolinking issues:**
```bash
npx react-native config
```
Verify `@bhojaniasgar/react-native-audio-waveform` is listed.

### Issue: App Crashes on Startup

**Symptoms:**
- App crashes immediately after launch
- Native crash logs
- "Signal 11 (SIGSEGV)" errors

**Solutions:**

1. **Check crash logs:**

**iOS:**
```bash
# View crash logs
~/Library/Logs/DiagnosticReports/
```

**Android:**
```bash
adb logcat | grep -i "fatal\|crash\|exception"
```

2. **Verify architecture compatibility:**
- iOS: Ensure building for arm64 (not x86_64 simulator issues)
- Android: Check ABI filters in `build.gradle`

3. **Check for memory issues:**
- Reduce concurrent operations
- Ensure proper cleanup of resources
- Monitor memory usage

4. **Disable Hermes (temporary test):**
In `android/app/build.gradle`:
```gradle
project.ext.react = [
    enableHermes: false
]
```


---

## Permission Issues

### Issue: Recording Permission Denied

**Symptoms:**
- `getPermission()` returns "denied"
- Recording fails to start
- No permission dialog shown

**Solutions:**

1. **Check permission configuration:**

**iOS - Info.plist:**
```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to record audio</string>
```

**Android - AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

2. **Request permission before recording:**
```typescript
const recorder = AudioWaveform.createRecorder();

const permission = await recorder.checkHasPermission();
if (permission !== 'granted') {
  const result = await recorder.getPermission();
  if (result !== 'granted') {
    Alert.alert('Permission Required', 'Microphone access is needed to record audio');
    return;
  }
}

await recorder.startRecording(config);
```

3. **Check system settings:**
- iOS: Settings → Privacy & Security → Microphone → Your App
- Android: Settings → Apps → Your App → Permissions → Microphone

4. **Reset permissions (testing):**
```bash
# iOS Simulator
xcrun simctl privacy booted reset microphone com.yourapp.bundleid

# Android
adb shell pm reset-permissions
```


### Issue: Permission Dialog Not Showing

**Symptoms:**
- `getPermission()` doesn't show dialog
- Permission stays "undetermined"
- No user prompt

**Solutions:**

1. **Verify Info.plist/Manifest entries** (see above)

2. **Check if permission was previously denied:**
Users must manually enable in system settings if previously denied.

3. **Test on physical device:**
Simulators may have different permission behavior.

4. **Guide user to settings:**
```typescript
import { Linking, Platform } from 'react-native';

const openSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
};

// Show alert with settings button
Alert.alert(
  'Permission Required',
  'Please enable microphone access in Settings',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: openSettings },
  ]
);
```

---

## Recording Issues

### Issue: Recording Fails to Start

**Symptoms:**
- `startRecording()` returns false
- No error message
- Recording state doesn't change

**Solutions:**

1. **Check permission first:**
```typescript
const permission = await recorder.checkHasPermission();
if (permission !== 'granted') {
  await recorder.getPermission();
}
```

2. **Verify audio session (iOS):**
Ensure no other app is using the microphone.

3. **Check file path permissions:**
```typescript
const config = {
  path: '/valid/writable/path/recording.m4a', // Ensure path is writable
  sampleRate: 44100,
  bitRate: 128000,
};
```


4. **Test with minimal config:**
```typescript
// Let library choose defaults
await recorder.startRecording({});
```

5. **Check for concurrent recordings:**
Only one recorder can be active at a time.

### Issue: No Audio Recorded / Silent File

**Symptoms:**
- Recording completes but file is silent
- Waveform shows no data
- File size is very small

**Solutions:**

1. **Check microphone hardware:**
Test with native voice recorder app.

2. **Verify encoder settings:**
```typescript
const config = {
  encoder: 1, // AAC (iOS/Android compatible)
  sampleRate: 44100, // Standard sample rate
  bitRate: 128000, // Adequate quality
};
```

3. **Check audio session category (iOS):**
Ensure proper audio session setup for recording.

4. **Test on physical device:**
Simulators may have microphone issues.

### Issue: Decibel Updates Not Working

**Symptoms:**
- `onDecibelUpdate` callback never fires
- Decibel value always -160
- Real-time monitoring not working

**Solutions:**

1. **Ensure recording is active:**
```typescript
await recorder.startRecording(config);

// Set callback BEFORE or AFTER starting (both work)
recorder.onDecibelUpdate((decibel) => {
  console.log('Decibel:', decibel);
});
```

2. **Check callback is properly set:**
```typescript
// Correct
recorder.onDecibelUpdate((db) => {
  setDecibel(db);
});

// Incorrect - missing callback
recorder.onDecibelUpdate(); // ❌
```


3. **Verify microphone input:**
Speak into microphone while monitoring.

4. **Check for callback errors:**
```typescript
recorder.onDecibelUpdate((db) => {
  try {
    console.log('Decibel:', db);
    setDecibel(db);
  } catch (error) {
    console.error('Callback error:', error);
  }
});
```

---

## Playback Issues

### Issue: Player Fails to Prepare

**Symptoms:**
- `prepare()` returns false
- Playback doesn't start
- "File not found" errors

**Solutions:**

1. **Verify file path:**
```typescript
import RNFS from 'react-native-fs';

// Check if file exists
const exists = await RNFS.exists(audioPath);
console.log('File exists:', exists);

// Use absolute path
const absolutePath = audioPath.startsWith('file://')
  ? audioPath
  : `file://${audioPath}`;
```

2. **Check file format:**
Supported formats: M4A, MP3, WAV, AAC
```typescript
const supportedFormats = ['.m4a', '.mp3', '.wav', '.aac'];
const isSupported = supportedFormats.some(ext => audioPath.endsWith(ext));
```

3. **Test with known good file:**
```typescript
// Use a bundled asset for testing
const testPath = 'path/to/bundled/audio.m4a';
```

4. **Check file permissions:**
Ensure app has read access to the file location.


### Issue: Playback Stutters or Lags

**Symptoms:**
- Audio playback is choppy
- Frequent pauses during playback
- Delayed response to controls

**Solutions:**

1. **Check file size and format:**
Large files or complex formats may decode slower.

2. **Reduce concurrent operations:**
```typescript
// Limit concurrent players
const MAX_PLAYERS = 10;
if (activePlayers.length >= MAX_PLAYERS) {
  await activePlayers[0].stop();
}
```

3. **Use appropriate update frequency:**
```typescript
const config = {
  path: audioPath,
  updateFrequency: UpdateFrequency.Low, // Reduce callback frequency
};
```

4. **Test on physical device:**
Simulators have different performance characteristics.

5. **Check for memory pressure:**
Monitor app memory usage and clean up unused resources.

### Issue: Seek Operation Doesn't Work

**Symptoms:**
- `seekTo()` doesn't change position
- Playback continues from wrong position
- Seek is very slow

**Solutions:**

1. **Ensure player is prepared:**
```typescript
await player.prepare(config);
await player.seekTo(position);
```

2. **Check position value:**
```typescript
const duration = await player.getDuration(DurationType.Max);
const validPosition = Math.max(0, Math.min(position, duration));
await player.seekTo(validPosition);
```

3. **Wait for seek to complete:**
```typescript
await player.seekTo(position);
// Seek is async, wait for it to complete
```


4. **Check file format:**
Some formats (VBR MP3) may have less accurate seeking.

### Issue: Multiple Players Interfere with Each Other

**Symptoms:**
- Starting one player stops another
- Audio from multiple players mixed
- Unexpected playback behavior

**Solutions:**

1. **Use unique player keys:**
```typescript
const player1 = AudioWaveform.createPlayer('player-1');
const player2 = AudioWaveform.createPlayer('player-2');
// Not: createPlayer('player') for both
```

2. **Manage audio focus (Android):**
Multiple players can play simultaneously, but system audio focus may affect behavior.

3. **Stop players explicitly:**
```typescript
await player1.stop();
await player2.start(0, 1.0);
```

4. **Use stopAllPlayers() for cleanup:**
```typescript
await AudioWaveform.stopAllPlayers();
```

---

## Waveform Extraction Issues

### Issue: Extraction Fails or Crashes

**Symptoms:**
- `extract()` throws error
- App crashes during extraction
- "Out of memory" errors

**Solutions:**

1. **Check file size:**
```typescript
// For very large files, increase samplesPerPixel
const config = {
  path: audioPath,
  samplesPerPixel: 500, // Higher = less memory, faster
  normalize: true,
};
```

2. **Verify file format:**
```typescript
const supportedFormats = ['.m4a', '.mp3', '.wav', '.aac'];
const ext = audioPath.substring(audioPath.lastIndexOf('.'));
if (!supportedFormats.includes(ext)) {
  console.error('Unsupported format:', ext);
}
```


3. **Handle errors gracefully:**
```typescript
try {
  const waveform = await extractor.extract(config);
} catch (error) {
  console.error('Extraction failed:', error);
  // Check error message for specific issue
}
```

4. **Test with smaller file first:**
Verify extraction works with a short audio file.

### Issue: Extraction is Very Slow

**Symptoms:**
- Extraction takes much longer than expected
- Progress updates are slow
- UI freezes during extraction

**Solutions:**

1. **Adjust resolution:**
```typescript
// Lower resolution = faster extraction
const config = {
  path: audioPath,
  samplesPerPixel: 1000, // Increase for faster extraction
};
```

2. **Show progress indicator:**
```typescript
extractor.onProgress((progress) => {
  console.log(`Progress: ${(progress * 100).toFixed(0)}%`);
  setExtractionProgress(progress);
});
```

3. **Test on physical device:**
Simulators are much slower than real devices.

4. **Check file format:**
Some formats decode faster than others (WAV > M4A > MP3).

5. **Verify release build:**
Debug builds are significantly slower:
```bash
# iOS
npx react-native run-ios --configuration Release

# Android
cd android && ./gradlew assembleRelease
```


### Issue: Waveform Data is Empty or Incorrect

**Symptoms:**
- Extracted waveform is all zeros
- Waveform doesn't match audio
- Unexpected data format

**Solutions:**

1. **Check return value:**
```typescript
const waveform = await extractor.extract(config);
console.log('Channels:', waveform.length);
console.log('Samples per channel:', waveform[0]?.length);
console.log('Sample values:', waveform[0]?.slice(0, 10));
```

2. **Verify normalization settings:**
```typescript
const config = {
  path: audioPath,
  samplesPerPixel: 100,
  normalize: true, // Enable normalization
  scale: 1.0,
  threshold: 0.01,
};
```

3. **Check audio file:**
Ensure file contains actual audio data (not silent).

4. **Test with different file:**
Verify extraction works with a known good audio file.

---

## Performance Issues

### Issue: High Memory Usage

**Symptoms:**
- App memory usage grows over time
- Memory warnings
- App crashes with OOM errors

**Solutions:**

1. **Stop players when done:**
```typescript
useEffect(() => {
  return () => {
    player.stop(); // Cleanup on unmount
  };
}, []);
```

2. **Cancel unnecessary extractions:**
```typescript
useEffect(() => {
  return () => {
    extractor.cancel(); // Cancel on unmount
  };
}, []);
```


3. **Use cleanup utilities:**
```typescript
// Stop all players at once
await AudioWaveform.stopAllPlayers();

// Cancel all extractors
await AudioWaveform.stopAllExtractors();
```

4. **Adjust waveform resolution:**
```typescript
// Lower resolution = less memory
const config = {
  samplesPerPixel: 500, // Higher value = less memory
};
```

5. **Profile memory usage:**
```typescript
if (__DEV__ && performance.memory) {
  console.log('Memory:', {
    used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
    total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
  });
}
```

### Issue: Slow Performance / Lag

**Symptoms:**
- UI feels sluggish
- Delayed response to user input
- Choppy animations

**Solutions:**

1. **Verify release build:**
Always test performance in release mode, not debug.

2. **Reduce callback frequency:**
```typescript
const config = {
  updateFrequency: UpdateFrequency.Low, // Reduce from High
};
```

3. **Throttle UI updates:**
```typescript
const lastUpdate = useRef(0);
const THROTTLE_MS = 100;

recorder.onDecibelUpdate((db) => {
  const now = Date.now();
  if (now - lastUpdate.current >= THROTTLE_MS) {
    setDecibel(db);
    lastUpdate.current = now;
  }
});
```

4. **Optimize render performance:**
```typescript
const WaveformDisplay = React.memo(({ data }) => {
  // Component only re-renders when data changes
  return <Waveform data={data} />;
});
```


5. **Limit concurrent operations:**
```typescript
const MAX_CONCURRENT = 5;
if (activeOperations.length >= MAX_CONCURRENT) {
  await activeOperations[0].complete();
}
```

---

## Platform-Specific Issues

### iOS-Specific Issues

#### Issue: Audio Session Interruption

**Symptoms:**
- Recording/playback stops when phone call comes in
- Audio doesn't resume after interruption
- Background audio issues

**Solutions:**

1. **Handle audio session interruptions:**
```typescript
import { AppState } from 'react-native';

useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      // Resume recording/playback if needed
    } else if (nextAppState === 'background') {
      // Pause or stop
    }
  });

  return () => subscription.remove();
}, []);
```

2. **Configure background audio (if needed):**
Add to Info.plist:
```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

#### Issue: Simulator vs Device Behavior

**Symptoms:**
- Works on simulator but not device
- Different performance characteristics
- Audio quality differences

**Solutions:**

1. **Always test on physical device** for audio features
2. **Check device-specific settings** (Low Power Mode, etc.)
3. **Verify code signing and provisioning profiles**


#### Issue: Bitcode Errors

**Symptoms:**
- Build fails with bitcode-related errors
- Archive fails for App Store

**Solutions:**

1. **Disable bitcode:**
In Xcode: Build Settings → Enable Bitcode → No

2. **Or in Podfile:**
```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['ENABLE_BITCODE'] = 'NO'
    end
  end
end
```

### Android-Specific Issues

#### Issue: Audio Focus Issues

**Symptoms:**
- Playback stops when other apps play audio
- Multiple audio sources conflict
- Unexpected pauses

**Solutions:**

1. **Handle audio focus properly:**
The library handles this internally, but be aware of system behavior.

2. **Test with other audio apps:**
Play music in another app and test your app's behavior.

#### Issue: Permission Denied on Android 6.0+

**Symptoms:**
- Permission request doesn't work
- Runtime permission errors
- Recording fails silently

**Solutions:**

1. **Request runtime permissions:**
```typescript
import { PermissionsAndroid, Platform } from 'react-native';

if (Platform.OS === 'android') {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
  );
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    console.log('Permission denied');
  }
}
```


2. **Check targetSdkVersion:**
Ensure proper permission handling for your target SDK.

#### Issue: File Path Issues on Android

**Symptoms:**
- "File not found" errors
- Permission denied for file access
- Scoped storage issues (Android 10+)

**Solutions:**

1. **Use app-specific directories:**
```typescript
import RNFS from 'react-native-fs';

// Use app's document directory
const audioPath = `${RNFS.DocumentDirectoryPath}/recording.m4a`;
```

2. **Handle scoped storage (Android 10+):**
```xml
<!-- In AndroidManifest.xml -->
<application
  android:requestLegacyExternalStorage="true">
```

3. **Request storage permissions:**
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

#### Issue: ProGuard/R8 Issues

**Symptoms:**
- Release build crashes
- Native methods not found
- Obfuscation errors

**Solutions:**

1. **Add ProGuard rules:**
Create `android/app/proguard-rules.pro`:
```proguard
-keep class com.margelo.nitro.** { *; }
-keep class com.audiowaveform.** { *; }
```

2. **Disable minification (testing):**
In `android/app/build.gradle`:
```gradle
buildTypes {
    release {
        minifyEnabled false
    }
}
```


---

## Debugging Tips

### Enable Verbose Logging

**iOS:**
```bash
# View all logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "YourApp"'

# Filter for audio-related logs
xcrun simctl spawn booted log stream --predicate 'eventMessage contains "Audio"'
```

**Android:**
```bash
# View all logs
adb logcat

# Filter for your app
adb logcat | grep "YourAppName"

# Filter for audio-related logs
adb logcat | grep -i "audio\|waveform"
```

### Check Nitro Modules Status

```typescript
import { NitroModules } from 'react-native-nitro-modules';

// Check if Nitro is available
const isNitroAvailable = typeof NitroModules.createHybridObject === 'function';
console.log('Nitro available:', isNitroAvailable);

// Try to create module
try {
  const audioWaveform = NitroModules.createHybridObject('AudioWaveform');
  console.log('AudioWaveform loaded:', !!audioWaveform);
  
  // Test creating instances
  const recorder = audioWaveform.createRecorder();
  console.log('Recorder created:', !!recorder);
} catch (error) {
  console.error('Module error:', error);
}
```

### Performance Profiling

**Measure operation times:**
```typescript
const measureTime = async (name: string, operation: () => Promise<any>) => {
  const start = performance.now();
  try {
    const result = await operation();
    const duration = performance.now() - start;
    console.log(`${name} took ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

// Usage
await measureTime('Waveform extraction', () => 
  extractor.extract(config)
);
```


**Memory profiling:**
```typescript
const logMemory = (label: string) => {
  if (__DEV__ && performance.memory) {
    const used = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
    const total = (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
    console.log(`[${label}] Memory: ${used}MB / ${total}MB`);
  }
};

// Usage
logMemory('Before extraction');
await extractor.extract(config);
logMemory('After extraction');
```

### Test with Minimal Example

Create a minimal test case to isolate the issue:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Button, Text } from 'react-native';
import { AudioWaveform } from '@bhojaniasgar/react-native-audio-waveform';

export function MinimalTest() {
  const [status, setStatus] = useState('Not started');
  const [recorder] = useState(() => {
    try {
      return AudioWaveform.createRecorder();
    } catch (error) {
      console.error('Failed to create recorder:', error);
      return null;
    }
  });

  const test = async () => {
    if (!recorder) {
      setStatus('Recorder not available');
      return;
    }

    try {
      setStatus('Checking permission...');
      const permission = await recorder.checkHasPermission();
      setStatus(`Permission: ${permission}`);

      if (permission !== 'granted') {
        setStatus('Requesting permission...');
        const result = await recorder.getPermission();
        setStatus(`Permission result: ${result}`);
      }

      setStatus('Starting recording...');
      const started = await recorder.startRecording({});
      setStatus(`Recording started: ${started}`);

      setTimeout(async () => {
        setStatus('Stopping recording...');
        const path = await recorder.stopRecording();
        setStatus(`Recording saved: ${path}`);
      }, 3000);
    } catch (error) {
      setStatus(`Error: ${error}`);
      console.error('Test error:', error);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Status: {status}</Text>
      <Button title="Run Test" onPress={test} />
    </View>
  );
}
```


### Common Error Messages

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| "NitroModules is not defined" | Nitro Modules not installed | Install react-native-nitro-modules |
| "Cannot create HybridObject" | Native module not linked | Rebuild app, check autolinking |
| "Permission denied" | Missing permissions | Add to Info.plist/AndroidManifest.xml |
| "File not found" | Invalid file path | Check path, use absolute paths |
| "Audio session error" | iOS audio session conflict | Handle interruptions, check other audio |
| "Out of memory" | Large file or too many operations | Reduce resolution, cleanup resources |
| "Unsupported format" | Invalid audio format | Use M4A, MP3, WAV, or AAC |
| "Seek failed" | Player not prepared | Call prepare() before seeking |
| "Recording failed" | Permission or hardware issue | Check permissions and microphone |
| "Extraction timeout" | File too large or slow device | Increase samplesPerPixel, test on device |

### Getting Help

If you're still experiencing issues:

1. **Check existing issues:**
   [GitHub Issues](https://github.com/bhojaniasgar/react-native-audio-waveform/issues)

2. **Search documentation:**
   - [API Documentation](./api/index.html)
   - [Usage Examples](./USAGE_EXAMPLES.md)
   - [Performance Guide](./PERFORMANCE.md)

3. **Create a minimal reproduction:**
   - Isolate the issue
   - Remove unnecessary code
   - Test on clean project

4. **Provide details when reporting:**
   - React Native version
   - Library version
   - Platform (iOS/Android)
   - Device/simulator
   - Error messages and logs
   - Minimal code example

5. **Open a new issue:**
   [Create Issue](https://github.com/bhojaniasgar/react-native-audio-waveform/issues/new)

---

## Additional Resources

- **[API Documentation](./api/index.html)** - Complete API reference
- **[Usage Examples](./USAGE_EXAMPLES.md)** - Code examples and patterns
- **[Performance Guide](./PERFORMANCE.md)** - Optimization tips and benchmarks
- **[README](../README.md)** - Quick start and installation
- **[GitHub Repository](https://github.com/bhojaniasgar/react-native-audio-waveform)** - Source code

---

**Version:** 2.0.0-beta.3  
**Last Updated:** February 2025  
**Maintained by:** [@bhojaniasgar](https://github.com/bhojaniasgar)

