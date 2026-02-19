/**
 * Basic Recording Example
 * 
 * Demonstrates simple audio recording using the useAudioRecorder hook.
 * This is the easiest way to add recording functionality to your app.
 */

import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { useAudioRecorder } from '@bhojaniasgar/react-native-audio-waveform';

export default function BasicRecordingExample() {
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
        <View style={styles.container}>
            <Text style={styles.title}>Basic Recording</Text>

            <Text style={styles.status}>
                Status: {isRecording ? (isPaused ? 'Paused' : 'Recording') : 'Stopped'}
            </Text>

            <View style={styles.buttonContainer}>
                <Button
                    title={isRecording ? 'Stop' : 'Start Recording'}
                    onPress={isRecording ? stopRecording : startRecording}
                />
            </View>

            {isRecording && (
                <View style={styles.buttonContainer}>
                    <Button
                        title={isPaused ? 'Resume' : 'Pause'}
                        onPress={isPaused ? resumeRecording : pauseRecording}
                    />
                </View>
            )}

            {recordingPath && (
                <View style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Saved to:</Text>
                    <Text style={styles.resultPath}>{recordingPath}</Text>
                </View>
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
    status: {
        fontSize: 18,
        marginBottom: 24,
        textAlign: 'center',
        color: '#666',
    },
    buttonContainer: {
        marginVertical: 8,
    },
    resultContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    resultPath: {
        fontSize: 12,
        color: '#666',
    },
});
