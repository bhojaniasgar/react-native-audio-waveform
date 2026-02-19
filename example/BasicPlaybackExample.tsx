/**
 * Basic Playback Example
 * 
 * Demonstrates simple audio playback using the useAudioPlayer hook.
 * Shows playback controls and position tracking.
 */

import React from 'react';
import { View, Button, Text, StyleSheet, Slider } from 'react-native';
import { useAudioPlayer } from '@bhojaniasgar/react-native-audio-waveform';

export default function BasicPlaybackExample() {
    // Replace with your audio file path
    const audioPath = '/path/to/audio.m4a';

    const {
        play,
        pause,
        stop,
        seekTo,
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

    const handleSeek = (value: number) => {
        seekTo(value);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Basic Playback</Text>

            {/* Time display */}
            <Text style={styles.timeText}>
                {formatTime(currentPosition)} / {formatTime(duration)}
            </Text>

            {/* Seek slider */}
            <Slider
                style={styles.slider}
                value={currentPosition}
                minimumValue={0}
                maximumValue={duration}
                onSlidingComplete={handleSeek}
                minimumTrackTintColor="#667eea"
                maximumTrackTintColor="#e0e0e0"
                thumbTintColor="#667eea"
            />

            {/* Playback controls */}
            <View style={styles.controls}>
                <Button
                    title={isPlaying ? 'Pause' : 'Play'}
                    onPress={isPlaying ? pause : play}
                />
                <View style={styles.buttonSpacer} />
                <Button title="Stop" onPress={stop} />
            </View>
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
        marginBottom: 32,
        textAlign: 'center',
    },
    timeText: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 16,
        color: '#666',
    },
    slider: {
        width: '100%',
        height: 40,
        marginBottom: 24,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonSpacer: {
        width: 16,
    },
});
