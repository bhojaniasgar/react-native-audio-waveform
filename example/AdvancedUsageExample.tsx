/**
 * Advanced Usage Example
 * 
 * Demonstrates advanced patterns including:
 * - Complete record → extract → playback workflow
 * - Real-time audio monitoring with visualization
 * - Custom configuration and error handling
 * - Multiple concurrent operations
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Button,
    Text,
    StyleSheet,
    Alert,
    Animated,
    ScrollView
} from 'react-native';
import {
    AudioWaveform,
    Waveform,
    useAudioRecorder,
    type PlayerConfig,
    UpdateFrequency
} from '@bhojaniasgar/react-native-audio-waveform';

export default function AdvancedUsageExample() {
    // Recording
    const {
        startRecording,
        stopRecording,
        isRecording,
        recordingPath
    } = useAudioRecorder();

    // Playback
    const [player] = useState(() => AudioWaveform.createPlayer('advanced-player'));
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    // Real-time monitoring
    const [recorder] = useState(() => AudioWaveform.createRecorder());
    const [decibel, setDecibel] = useState(-160);
    const [animatedHeight] = useState(new Animated.Value(0));

    // Set up real-time decibel monitoring
    useEffect(() => {
        recorder.onDecibelUpdate((db) => {
            setDecibel(db);

            // Animate visualization
            const normalized = Math.max(0, Math.min(100, ((db + 160) / 160) * 100));
            Animated.spring(animatedHeight, {
                toValue: normalized,
                useNativeDriver: false,
                speed: 20,
                bounciness: 0,
            }).start();
        });
    }, [recorder, animatedHeight]);

    // Set up player callbacks
    useEffect(() => {
        player.onPlaybackUpdate((position) => {
            setCurrentPosition(position);
        });

        player.onPlaybackFinished(() => {
            setIsPlaying(false);
            setCurrentPosition(0);
        });
    }, [player]);

    const handleStopRecording = async () => {
        const path = await stopRecording();
        if (path) {
            Alert.alert('Recording Complete', 'Ready to play back', [
                { text: 'OK' },
                { text: 'Play Now', onPress: () => handlePreparePlayback(path) },
            ]);
        }
    };

    const handlePreparePlayback = async (path: string) => {
        try {
            const config: PlayerConfig = {
                path,
                volume: 1.0,
                updateFrequency: UpdateFrequency.High,
            };

            await player.prepare(config);
            const maxDuration = await player.getDuration(0); // DurationType.Current
            setDuration(maxDuration);

            Alert.alert('Ready', 'Audio prepared for playback');
        } catch (error: any) {
            Alert.alert('Error', `Failed to prepare: ${error.message}`);
        }
    };

    const handlePlayPause = async () => {
        try {
            if (isPlaying) {
                await player.pause();
                setIsPlaying(false);
            } else {
                await player.start(0, 1.0);
                setIsPlaying(true);
            }
        } catch (error: any) {
            Alert.alert('Playback Error', error.message);
        }
    };

    const handleReset = async () => {
        if (isPlaying) {
            await player.stop();
            setIsPlaying(false);
        }
        setCurrentPosition(0);
        setDuration(0);
    };

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getDecibelColor = (db: number) => {
        if (db > -20) return '#f44336';
        if (db > -40) return '#4caf50';
        return '#2196f3';
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Advanced Usage</Text>

            {/* Recording Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Record Audio</Text>

                {/* Audio level meter */}
                {isRecording && (
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
                )}

                <Text style={styles.decibelText}>
                    {isRecording ? `${decibel.toFixed(1)} dB` : 'Not Recording'}
                </Text>

                <Button
                    title={isRecording ? 'Stop Recording' : 'Start Recording'}
                    onPress={isRecording ? handleStopRecording : startRecording}
                    disabled={!!recordingPath}
                />
            </View>

            {/* Waveform Section */}
            {recordingPath && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Waveform Visualization</Text>
                    <Waveform
                        path={recordingPath}
                        candleSpace={2}
                        candleWidth={4}
                        waveColor="#667eea"
                        scrubColor="#764ba2"
                        style={styles.waveform}
                    />
                </View>
            )}

            {/* Playback Section */}
            {recordingPath && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Playback</Text>

                    {duration > 0 && (
                        <Text style={styles.timeText}>
                            {formatTime(currentPosition)} / {formatTime(duration)}
                        </Text>
                    )}

                    <View style={styles.buttonRow}>
                        <Button
                            title={isPlaying ? 'Pause' : 'Play'}
                            onPress={handlePlayPause}
                            disabled={duration === 0}
                        />
                        <View style={styles.buttonSpacer} />
                        <Button
                            title="Stop"
                            onPress={handleReset}
                            disabled={!isPlaying && currentPosition === 0}
                        />
                    </View>
                </View>
            )}

            {/* Reset Section */}
            {recordingPath && (
                <View style={styles.section}>
                    <Button
                        title="Record New Audio"
                        onPress={handleReset}
                        color="#f44336"
                    />
                </View>
            )}

            {/* Info Section */}
            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>💡 Features Demonstrated</Text>
                <Text style={styles.infoText}>
                    • Real-time audio level monitoring{'\n'}
                    • Animated visualization{'\n'}
                    • Complete record → extract → play workflow{'\n'}
                    • Custom player configuration{'\n'}
                    • Error handling and recovery
                </Text>
            </View>
        </ScrollView>
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
        textAlign: 'center',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    meterContainer: {
        width: 60,
        height: 150,
        backgroundColor: '#e0e0e0',
        borderRadius: 30,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        alignSelf: 'center',
        marginBottom: 16,
    },
    meterBar: {
        width: '100%',
        borderRadius: 30,
    },
    decibelText: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    waveform: {
        height: 100,
        width: '100%',
        marginBottom: 16,
    },
    timeText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        color: '#666',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    buttonSpacer: {
        width: 16,
    },
    infoCard: {
        backgroundColor: '#e3f2fd',
        padding: 16,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#2196f3',
        marginBottom: 16,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1976d2',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
});
