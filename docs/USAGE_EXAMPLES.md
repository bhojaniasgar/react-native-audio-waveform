# Usage Examples

This guide provides comprehensive examples for using the react-native-audio-waveform library with Nitro Modules. All examples use TypeScript for type safety.

## Table of Contents

- [Basic Recording Example](#basic-recording-example)
- [Basic Playback Example](#basic-playback-example)
- [Waveform Extraction Example](#waveform-extraction-example)
- [Advanced Usage Patterns](#advanced-usage-patterns)

---

## Basic Recording Example

### Simple Recording with Hooks

The easiest way to record audio is using the `useAudioRecorder` hook:

```typescript
import React from 'react';
import { View, Button, Text } from 'react-native';
import { useAudioRecorder } from '@bhojaniasgar/react-native-audio-waveform';

export function SimpleRecorder() {
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    isPaused,
    recordingPath,
  } = useAudioRecorder();

  return (
    <View>
      <Text>Status: {isRecording ? (isPaused ? 'Paused' : 'Recording') : 'Stopped'}</Text>
      
      <Button
        title={isRecording ? 'Stop' : 'Start Recording'}
        onPress={isRecording ? stopRecording : startRecording}
      />
      
      {isRecording && (
        <Button
          title={isPaused ? 'Resume' : 'Pause'}
          onPress={isPaused ? resumeRecording : pauseRecording}
        />
      )}
      
      {recordingPath && <Text>Saved to: {recordingPath}</Text>}
    </View>
  );
}
```


### Recording with Custom Configuration

For more control over recording settings:

```typescript
import React, { useState } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import { AudioWaveform, type RecordingConfig } from '@bhojaniasgar/react-native-audio-waveform';

export function CustomRecorder() {
  const [recorder] = useState(() => AudioWaveform.createRecorder());
  const [isRecording, setIsRecording] = useState(false);
  const [decibel, setDecibel] = useState(0);

  const startRecording = async () => {
    try {
      // Check permissions first
      const permission = await recorder.checkHasPermission();
      
      if (permission !== 'granted') {
        const result = await recorder.getPermission();
        if (result !== 'granted') {
          Alert.alert('Permission Denied', 'Microphone access is required');
          return;
        }
      }

      // Configure recording settings
      const config: RecordingConfig = {
        sampleRate: 44100,
        bitRate: 128000,
        encoder: 1, // AAC encoder
        fileNameFormat: 'recording_YYYY-MM-DD_HH-mm-ss',
        useLegacyNormalization: false,
      };

      // Set up real-time decibel monitoring
      recorder.onDecibelUpdate((db) => {
        setDecibel(db);
      });

      const success = await recorder.startRecording(config);
      if (success) {
        setIsRecording(true);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to start recording: ${error}`);
    }
  };

  const stopRecording = async () => {
    try {
      const path = await recorder.stopRecording();
      setIsRecording(false);
      setDecibel(0);
      Alert.alert('Success', `Recording saved to: ${path}`);
    } catch (error) {
      Alert.alert('Error', `Failed to stop recording: ${error}`);
    }
  };

  return (
    <View>
      <Text>Decibel Level: {decibel.toFixed(2)} dB</Text>
      
      <Button
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        onPress={isRecording ? stopRecording : startRecording}
      />
    </View>
  );
}
```


### Recording with Permission Handling

Complete example with proper permission handling:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Button, Text, Alert, Platform } from 'react-native';
import { useAudioPermission, useAudioRecorder } from '@bhojaniasgar/react-native-audio-waveform';

export function PermissionAwareRecorder() {
  const { hasPermission, requestPermission, permissionStatus } = useAudioPermission();
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();

  useEffect(() => {
    // Check permission on mount
    if (!hasPermission) {
      Alert.alert(
        'Microphone Access',
        'This app needs microphone access to record audio.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Access', onPress: requestPermission },
        ]
      );
    }
  }, [hasPermission, requestPermission]);

  const handleRecord = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Cannot record without microphone access');
        return;
      }
    }

    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <View>
      <Text>Permission: {permissionStatus}</Text>
      
      <Button
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        onPress={handleRecord}
        disabled={!hasPermission && permissionStatus === 'denied'}
      />
      
      {permissionStatus === 'denied' && (
        <Text style={{ color: 'red' }}>
          Microphone access denied. Please enable it in settings.
        </Text>
      )}
    </View>
  );
}
```

---

## Basic Playback Example

### Simple Playback with Hooks

The easiest way to play audio is using the `useAudioPlayer` hook:

```typescript
import React from 'react';
import { View, Button, Text } from 'react-native';
import { useAudioPlayer } from '@bhojaniasgar/react-native-audio-waveform';

export function SimplePlayer() {
  const audioPath = '/path/to/audio.m4a';
  
  const {
    play,
    pause,
    stop,
    isPlaying,
    currentPosition,
    duration,
  } = useAudioPlayer(audioPath);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View>
      <Text>
        {formatTime(currentPosition)} / {formatTime(duration)}
      </Text>
      
      <Button
        title={isPlaying ? 'Pause' : 'Play'}
        onPress={isPlaying ? pause : play}
      />
      
      <Button title="Stop" onPress={stop} />
    </View>
  );
}
```


### Playback with Custom Configuration

For advanced playback control:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Button, Text, Slider, Alert } from 'react-native';
import { 
  AudioWaveform, 
  type PlayerConfig,
  UpdateFrequency,
  DurationType 
} from '@bhojaniasgar/react-native-audio-waveform';

export function CustomPlayer() {
  const audioPath = '/path/to/audio.m4a';
  const [player] = useState(() => AudioWaveform.createPlayer('main-player'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);

  useEffect(() => {
    const initPlayer = async () => {
      try {
        const config: PlayerConfig = {
          path: audioPath,
          volume: 1.0,
          updateFrequency: UpdateFrequency.High, // High-frequency position updates
          startPosition: 0,
        };

        // Set up playback position callback
        player.onPlaybackUpdate((position) => {
          setCurrentPosition(position);
        });

        // Set up playback finished callback
        player.onPlaybackFinished(() => {
          setIsPlaying(false);
          setCurrentPosition(0);
        });

        const success = await player.prepare(config);
        if (success) {
          const maxDuration = await player.getDuration(DurationType.Max);
          setDuration(maxDuration);
        }
      } catch (error) {
        Alert.alert('Error', `Failed to prepare player: ${error}`);
      }
    };

    initPlayer();
  }, [audioPath, player]);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await player.pause();
        setIsPlaying(false);
      } else {
        await player.start(0, speed); // 0 = loop disabled
        setIsPlaying(true);
      }
    } catch (error) {
      Alert.alert('Error', `Playback error: ${error}`);
    }
  };

  const handleStop = async () => {
    try {
      await player.stop();
      setIsPlaying(false);
      setCurrentPosition(0);
    } catch (error) {
      Alert.alert('Error', `Stop error: ${error}`);
    }
  };

  const handleSeek = async (position: number) => {
    try {
      await player.seekTo(position);
      setCurrentPosition(position);
    } catch (error) {
      Alert.alert('Error', `Seek error: ${error}`);
    }
  };

  const handleVolumeChange = async (newVolume: number) => {
    try {
      await player.setVolume(newVolume);
      setVolume(newVolume);
    } catch (error) {
      Alert.alert('Error', `Volume error: ${error}`);
    }
  };

  const handleSpeedChange = async (newSpeed: number) => {
    try {
      await player.setPlaybackSpeed(newSpeed);
      setSpeed(newSpeed);
      
      // Restart playback with new speed if currently playing
      if (isPlaying) {
        await player.start(0, newSpeed);
      }
    } catch (error) {
      Alert.alert('Error', `Speed error: ${error}`);
    }
  };

  return (
    <View>
      <Text>Position: {currentPosition}ms / {duration}ms</Text>
      
      <Slider
        value={currentPosition}
        minimumValue={0}
        maximumValue={duration}
        onSlidingComplete={handleSeek}
      />
      
      <Button
        title={isPlaying ? 'Pause' : 'Play'}
        onPress={handlePlayPause}
      />
      
      <Button title="Stop" onPress={handleStop} />
      
      <Text>Volume: {(volume * 100).toFixed(0)}%</Text>
      <Slider
        value={volume}
        minimumValue={0}
        maximumValue={1}
        onValueChange={handleVolumeChange}
      />
      
      <Text>Speed: {speed}x</Text>
      <View style={{ flexDirection: 'row' }}>
        <Button title="0.5x" onPress={() => handleSpeedChange(0.5)} />
        <Button title="1.0x" onPress={() => handleSpeedChange(1.0)} />
        <Button title="1.5x" onPress={() => handleSpeedChange(1.5)} />
        <Button title="2.0x" onPress={() => handleSpeedChange(2.0)} />
      </View>
    </View>
  );
}
```


---

## Waveform Extraction Example

### Basic Waveform Extraction

Extract waveform data from an audio file:

```typescript
import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator, Alert } from 'react-native';
import { AudioWaveform, type ExtractionConfig } from '@bhojaniasgar/react-native-audio-waveform';

export function WaveformExtractor() {
  const audioPath = '/path/to/audio.m4a';
  const [extractor] = useState(() => AudioWaveform.createExtractor('waveform-1'));
  const [waveformData, setWaveformData] = useState<number[][] | null>(null);
  const [progress, setProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);

  const extractWaveform = async () => {
    try {
      setIsExtracting(true);
      setProgress(0);

      const config: ExtractionConfig = {
        path: audioPath,
        samplesPerPixel: 100, // Higher = more compressed waveform
        normalize: true,
        scale: 1.0,
        threshold: 0.01,
      };

      // Set up progress callback
      extractor.onProgress((progressValue) => {
        setProgress(progressValue);
      });

      const data = await extractor.extract(config);
      setWaveformData(data);
      Alert.alert('Success', `Extracted ${data[0].length} samples`);
    } catch (error) {
      Alert.alert('Error', `Extraction failed: ${error}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const cancelExtraction = () => {
    extractor.cancel();
    setIsExtracting(false);
  };

  return (
    <View>
      {isExtracting ? (
        <>
          <ActivityIndicator size="large" />
          <Text>Extracting: {(progress * 100).toFixed(0)}%</Text>
          <Button title="Cancel" onPress={cancelExtraction} />
        </>
      ) : (
        <Button title="Extract Waveform" onPress={extractWaveform} />
      )}
      
      {waveformData && (
        <Text>
          Channels: {waveformData.length}, Samples: {waveformData[0].length}
        </Text>
      )}
    </View>
  );
}
```

### Waveform Extraction with Visualization

Extract and display waveform using the built-in component:

```typescript
import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { Waveform } from '@bhojaniasgar/react-native-audio-waveform';

export function WaveformVisualizer() {
  const [audioPath, setAudioPath] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      {audioPath && (
        <Waveform
          path={audioPath}
          candleSpace={2}
          candleWidth={4}
          waveColor="#667eea"
          scrubColor="#764ba2"
          style={styles.waveform}
        />
      )}
      
      <Button
        title="Load Audio"
        onPress={() => setAudioPath('/path/to/audio.m4a')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  waveform: {
    height: 100,
    width: '100%',
  },
});
```


---

## Advanced Usage Patterns

### Multiple Concurrent Players

Play multiple audio files simultaneously:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Button, Text, FlatList, StyleSheet } from 'react-native';
import { AudioWaveform } from '@bhojaniasgar/react-native-audio-waveform';

interface AudioTrack {
  id: string;
  path: string;
  name: string;
}

export function MultiPlayerExample() {
  const [tracks] = useState<AudioTrack[]>([
    { id: 'track-1', path: '/path/to/audio1.m4a', name: 'Track 1' },
    { id: 'track-2', path: '/path/to/audio2.m4a', name: 'Track 2' },
    { id: 'track-3', path: '/path/to/audio3.m4a', name: 'Track 3' },
  ]);
  
  const [players] = useState(() => 
    new Map(tracks.map(track => [
      track.id,
      AudioWaveform.createPlayer(track.id)
    ]))
  );
  
  const [playingStates, setPlayingStates] = useState<Map<string, boolean>>(
    new Map(tracks.map(track => [track.id, false]))
  );

  useEffect(() => {
    // Prepare all players
    tracks.forEach(async (track) => {
      const player = players.get(track.id);
      if (player) {
        await player.prepare({ path: track.path });
      }
    });

    // Cleanup on unmount
    return () => {
      AudioWaveform.stopAllPlayers();
    };
  }, [tracks, players]);

  const togglePlay = async (trackId: string) => {
    const player = players.get(trackId);
    if (!player) return;

    const isPlaying = playingStates.get(trackId) || false;

    if (isPlaying) {
      await player.pause();
    } else {
      await player.start(0, 1.0);
    }

    setPlayingStates(new Map(playingStates.set(trackId, !isPlaying)));
  };

  const stopAll = async () => {
    await AudioWaveform.stopAllPlayers();
    setPlayingStates(new Map(tracks.map(track => [track.id, false])));
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.trackItem}>
            <Text style={styles.trackName}>{item.name}</Text>
            <Button
              title={playingStates.get(item.id) ? 'Pause' : 'Play'}
              onPress={() => togglePlay(item.id)}
            />
          </View>
        )}
      />
      
      <Button title="Stop All" onPress={stopAll} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  trackItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  trackName: {
    fontSize: 16,
    fontWeight: '500',
  },
});
```


### Complete Recording and Playback Workflow

Record audio, extract waveform, and play it back:

```typescript
import React, { useState } from 'react';
import { View, Button, Text, StyleSheet, Alert } from 'react-native';
import { 
  AudioWaveform, 
  Waveform,
  useAudioRecorder 
} from '@bhojaniasgar/react-native-audio-waveform';

export function CompleteWorkflow() {
  const { startRecording, stopRecording, isRecording, recordingPath } = useAudioRecorder();
  const [player] = useState(() => AudioWaveform.createPlayer('playback'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformPath, setWaveformPath] = useState<string | null>(null);

  const handleStopRecording = async () => {
    const path = await stopRecording();
    if (path) {
      setWaveformPath(path);
      Alert.alert('Recording Complete', 'Ready to play back');
    }
  };

  const handlePlayback = async () => {
    if (!waveformPath) return;

    try {
      if (isPlaying) {
        await player.pause();
        setIsPlaying(false);
      } else {
        // Prepare player if not already prepared
        if (!player.isPlaying()) {
          await player.prepare({ path: waveformPath });
          
          player.onPlaybackFinished(() => {
            setIsPlaying(false);
          });
        }
        
        await player.start(0, 1.0);
        setIsPlaying(true);
      }
    } catch (error) {
      Alert.alert('Playback Error', `${error}`);
    }
  };

  const handleReset = async () => {
    if (isPlaying) {
      await player.stop();
      setIsPlaying(false);
    }
    setWaveformPath(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record & Playback</Text>
      
      {/* Recording Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 1: Record</Text>
        <Button
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
          onPress={isRecording ? handleStopRecording : startRecording}
          disabled={!!waveformPath}
        />
      </View>

      {/* Waveform Visualization */}
      {waveformPath && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 2: Waveform</Text>
          <Waveform
            path={waveformPath}
            candleSpace={2}
            candleWidth={4}
            waveColor="#667eea"
            scrubColor="#764ba2"
            style={styles.waveform}
          />
        </View>
      )}

      {/* Playback Section */}
      {waveformPath && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 3: Playback</Text>
          <Button
            title={isPlaying ? 'Pause' : 'Play'}
            onPress={handlePlayback}
          />
        </View>
      )}

      {/* Reset */}
      {waveformPath && (
        <Button title="Record New" onPress={handleReset} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  waveform: {
    height: 100,
    width: '100%',
  },
});
```


### Batch Waveform Extraction

Extract waveforms from multiple files efficiently:

```typescript
import React, { useState } from 'react';
import { View, Button, Text, FlatList, StyleSheet } from 'react-native';
import { AudioWaveform, type ExtractionConfig } from '@bhojaniasgar/react-native-audio-waveform';

interface AudioFile {
  id: string;
  path: string;
  name: string;
  waveform?: number[][];
  progress?: number;
  status: 'pending' | 'extracting' | 'complete' | 'error';
}

export function BatchExtractor() {
  const [files, setFiles] = useState<AudioFile[]>([
    { id: '1', path: '/path/to/audio1.m4a', name: 'Audio 1', status: 'pending' },
    { id: '2', path: '/path/to/audio2.m4a', name: 'Audio 2', status: 'pending' },
    { id: '3', path: '/path/to/audio3.m4a', name: 'Audio 3', status: 'pending' },
  ]);

  const extractAll = async () => {
    const config: ExtractionConfig = {
      path: '', // Will be set per file
      samplesPerPixel: 100,
      normalize: true,
    };

    // Process files sequentially to avoid memory issues
    for (const file of files) {
      const extractor = AudioWaveform.createExtractor(file.id);
      
      try {
        // Update status to extracting
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'extracting' as const, progress: 0 } : f
        ));

        // Set up progress callback
        extractor.onProgress((progress) => {
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress } : f
          ));
        });

        // Extract waveform
        const waveform = await extractor.extract({ ...config, path: file.path });

        // Update with result
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, waveform, status: 'complete' as const, progress: 1 } 
            : f
        ));
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'error' as const } : f
        ));
      }
    }
  };

  const getStatusIcon = (status: AudioFile['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'extracting': return '⚙️';
      case 'complete': return '✅';
      case 'error': return '❌';
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Extract All" onPress={extractAll} />
      
      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.fileItem}>
            <Text style={styles.fileName}>
              {getStatusIcon(item.status)} {item.name}
            </Text>
            {item.status === 'extracting' && (
              <Text style={styles.progress}>
                {((item.progress || 0) * 100).toFixed(0)}%
              </Text>
            )}
            {item.status === 'complete' && item.waveform && (
              <Text style={styles.info}>
                {item.waveform[0].length} samples
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  fileItem: {
    padding: 12,
    marginVertical: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
  },
  progress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  info: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
```


### Real-time Audio Monitoring

Monitor audio levels during recording with visualization:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Button, Text, StyleSheet, Animated } from 'react-native';
import { AudioWaveform } from '@bhojaniasgar/react-native-audio-waveform';

export function AudioMonitor() {
  const [recorder] = useState(() => AudioWaveform.createRecorder());
  const [isRecording, setIsRecording] = useState(false);
  const [decibel, setDecibel] = useState(-160); // Minimum dB
  const [animatedHeight] = useState(new Animated.Value(0));

  useEffect(() => {
    // Set up real-time decibel monitoring
    recorder.onDecibelUpdate((db) => {
      setDecibel(db);
      
      // Animate visualization (normalize -160 to 0 dB to 0-100%)
      const normalized = Math.max(0, Math.min(100, ((db + 160) / 160) * 100));
      
      Animated.spring(animatedHeight, {
        toValue: normalized,
        useNativeDriver: false,
        speed: 20,
        bounciness: 0,
      }).start();
    });
  }, [recorder, animatedHeight]);

  const startRecording = async () => {
    try {
      const permission = await recorder.checkHasPermission();
      if (permission !== 'granted') {
        await recorder.getPermission();
      }

      await recorder.startRecording({
        sampleRate: 44100,
        bitRate: 128000,
      });
      
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stopRecording();
      setIsRecording(false);
      setDecibel(-160);
      animatedHeight.setValue(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const getDecibelColor = (db: number) => {
    if (db > -20) return '#f44336'; // Red - too loud
    if (db > -40) return '#4caf50'; // Green - good level
    return '#2196f3'; // Blue - quiet
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Level Monitor</Text>
      
      {/* Visual meter */}
      <View style={styles.meterContainer}>
        <Animated.View
          style={[
            styles.meterBar,
            {
              height: animatedHeight.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: getDecibelColor(decibel),
            },
          ]}
        />
      </View>

      {/* Decibel reading */}
      <Text style={styles.decibelText}>
        {isRecording ? `${decibel.toFixed(1)} dB` : 'Not Recording'}
      </Text>

      {/* Level indicator */}
      {isRecording && (
        <Text style={styles.levelIndicator}>
          {decibel > -20 && '🔴 Too Loud'}
          {decibel <= -20 && decibel > -40 && '🟢 Good Level'}
          {decibel <= -40 && '🔵 Too Quiet'}
        </Text>
      )}

      {/* Controls */}
      <Button
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        onPress={isRecording ? stopRecording : startRecording}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  meterContainer: {
    width: 60,
    height: 300,
    backgroundColor: '#e0e0e0',
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  meterBar: {
    width: '100%',
    borderRadius: 30,
  },
  decibelText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  levelIndicator: {
    fontSize: 18,
    marginBottom: 24,
  },
});
```


### Error Handling and Recovery

Robust error handling for production apps:

```typescript
import React, { useState } from 'react';
import { View, Button, Text, Alert, StyleSheet } from 'react-native';
import { 
  AudioWaveform, 
  isNitroModulesAvailable,
  getNitroStatus 
} from '@bhojaniasgar/react-native-audio-waveform';

export function RobustAudioApp() {
  const [recorder] = useState(() => {
    try {
      return AudioWaveform.createRecorder();
    } catch (error) {
      console.error('Failed to create recorder:', error);
      return null;
    }
  });
  
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check Nitro availability on mount
  React.useEffect(() => {
    if (!isNitroModulesAvailable()) {
      const status = getNitroStatus();
      setError(
        `Nitro Modules unavailable: ${status.error}\n` +
        `Platform: ${status.platform}\n` +
        `RN Version: ${status.reactNativeVersion}`
      );
    }
  }, []);

  const handleStartRecording = async () => {
    if (!recorder) {
      Alert.alert('Error', 'Recorder not available');
      return;
    }

    try {
      setError(null);

      // Check permissions
      const permission = await recorder.checkHasPermission();
      
      if (permission !== 'granted') {
        const result = await recorder.getPermission();
        
        if (result !== 'granted') {
          throw new Error('Microphone permission denied');
        }
      }

      // Start recording with error handling
      const success = await recorder.startRecording({
        sampleRate: 44100,
        bitRate: 128000,
      });

      if (!success) {
        throw new Error('Failed to start recording');
      }

      setIsRecording(true);
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      
      Alert.alert(
        'Recording Error',
        errorMessage,
        [
          { text: 'OK' },
          { 
            text: 'Retry', 
            onPress: handleStartRecording 
          },
        ]
      );
    }
  };

  const handleStopRecording = async () => {
    if (!recorder) return;

    try {
      const path = await recorder.stopRecording();
      setIsRecording(false);
      
      if (path) {
        Alert.alert('Success', `Recording saved to: ${path}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to stop recording');
      setIsRecording(false);
    }
  };

  if (!isNitroModulesAvailable()) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>⚠️ Feature Unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.helpText}>
          Please ensure you have:{'\n'}
          • React Native 0.71.0+{'\n'}
          • iOS 13.0+ or Android API 21+{'\n'}
          • Properly linked native modules
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Recorder</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}

      <Button
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        onPress={isRecording ? handleStopRecording : handleStartRecording}
        disabled={!recorder}
      />

      {!recorder && (
        <Text style={styles.warningText}>
          Recorder initialization failed. Check console for details.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginTop: 16,
  },
  warningText: {
    color: '#ff9800',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
```


### Performance Optimization

Optimize for high-performance scenarios:

```typescript
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { AudioWaveform } from '@bhojaniasgar/react-native-audio-waveform';

export function PerformanceOptimized() {
  // Use refs to avoid recreating instances
  const recorderRef = useRef(AudioWaveform.createRecorder());
  const playerRef = useRef(AudioWaveform.createPlayer('optimized-player'));
  
  const [isRecording, setIsRecording] = useState(false);
  const [decibel, setDecibel] = useState(0);
  
  // Throttle decibel updates to avoid excessive re-renders
  const lastUpdateRef = useRef(0);
  const THROTTLE_MS = 100; // Update UI max 10 times per second

  useEffect(() => {
    const recorder = recorderRef.current;

    // Set up decibel callback with throttling
    recorder.onDecibelUpdate((db) => {
      const now = Date.now();
      if (now - lastUpdateRef.current >= THROTTLE_MS) {
        setDecibel(db);
        lastUpdateRef.current = now;
      }
    });

    // Cleanup on unmount
    return () => {
      if (isRecording) {
        recorder.stopRecording().catch(console.error);
      }
    };
  }, [isRecording]);

  // Memoize callbacks to prevent unnecessary re-renders
  const startRecording = useCallback(async () => {
    try {
      await recorderRef.current.startRecording({
        sampleRate: 44100,
        bitRate: 128000,
      });
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      await recorderRef.current.stopRecording();
      setIsRecording(false);
    } catch (error) {
      console.error('Stop error:', error);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Optimized</Text>
      
      {/* Only update when decibel changes significantly */}
      <Text style={styles.decibel}>
        {isRecording ? `${decibel.toFixed(1)} dB` : 'Ready'}
      </Text>
      
      <Button
        title={isRecording ? 'Stop' : 'Start'}
        onPress={isRecording ? stopRecording : startRecording}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  decibel: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 32,
  },
});
```

---

## Best Practices

### 1. Instance Management

Always create instances once and reuse them:

```typescript
// ✅ Good - Create once
const [recorder] = useState(() => AudioWaveform.createRecorder());

// ❌ Bad - Creates new instance on every render
const recorder = AudioWaveform.createRecorder();
```

### 2. Cleanup

Always clean up resources when components unmount:

```typescript
useEffect(() => {
  return () => {
    // Stop recording/playback
    recorder.stopRecording();
    player.stop();
    
    // Or stop all at once
    AudioWaveform.stopAllPlayers();
  };
}, []);
```

### 3. Error Handling

Always wrap async operations in try-catch:

```typescript
try {
  await recorder.startRecording(config);
} catch (error) {
  // Handle error appropriately
  console.error('Recording failed:', error);
  Alert.alert('Error', error.message);
}
```

### 4. Permission Handling

Check permissions before recording:

```typescript
const permission = await recorder.checkHasPermission();
if (permission !== 'granted') {
  await recorder.getPermission();
}
```

### 5. Performance

- Throttle UI updates for real-time monitoring
- Use refs for instances that don't need to trigger re-renders
- Memoize callbacks with `useCallback`
- Cancel long-running operations when appropriate

---

## TypeScript Tips

### Type Safety

The library provides full TypeScript support:

```typescript
import type { 
  RecordingConfig,
  PlayerConfig,
  ExtractionConfig,
  AudioRecorder,
  AudioPlayer,
  WaveformExtractor,
} from '@bhojaniasgar/react-native-audio-waveform';

// All configs are fully typed
const config: RecordingConfig = {
  sampleRate: 44100, // TypeScript will validate this
  bitRate: 128000,
  // encoder: 'invalid', // ❌ TypeScript error
};
```

### Enums

Use provided enums for type-safe values:

```typescript
import { DurationType, UpdateFrequency } from '@bhojaniasgar/react-native-audio-waveform';

const duration = await player.getDuration(DurationType.Max);

const config: PlayerConfig = {
  path: audioPath,
  updateFrequency: UpdateFrequency.High,
};
```

---

## Additional Resources

- [API Documentation](./api/index.html) - Complete API reference
- [Performance Guide](./PERFORMANCE.md) - Performance benchmarks and optimization tips
- [Migration Guide](../README.md#migration) - Upgrading from v1.x
- [GitHub Repository](https://github.com/bhojaniasgar/react-native-audio-waveform) - Source code and issues
- [Example App](../example/) - Full working examples

---

## Need Help?

If you encounter issues or have questions:

1. Check the [API Documentation](./api/index.html)
2. Review these usage examples
3. Search [GitHub Issues](https://github.com/bhojaniasgar/react-native-audio-waveform/issues)
4. Create a new issue with a minimal reproduction

---

**Note**: All examples use Nitro Modules (v2.0+). For v1.x examples, see the legacy documentation.
