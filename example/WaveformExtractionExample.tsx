/**
 * Waveform Extraction Example
 * 
 * Demonstrates extracting waveform data from audio files with progress tracking.
 * Shows both the extraction process and visualization using the Waveform component.
 */

import React, { useState } from 'react';
import { View, Button, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import {
    AudioWaveform,
    Waveform,
    type ExtractionConfig
} from '@bhojaniasgar/react-native-audio-waveform';

export default function WaveformExtractionExample() {
    const audioPath = '/path/to/audio.m4a';
    const [extractor] = useState(() => AudioWaveform.createExtractor('waveform-example'));
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

            // Extract waveform data
            const data = await extractor.extract(config);
            setWaveformData(data);

            Alert.alert(
                'Extraction Complete',
                `Extracted ${data.length} channel(s) with ${data[0].length} samples each`
            );
        } catch (error: any) {
            Alert.alert('Extraction Error', error.message);
        } finally {
            setIsExtracting(false);
        }
    };

    const cancelExtraction = () => {
        extractor.cancel();
        setIsExtracting(false);
        Alert.alert('Cancelled', 'Waveform extraction cancelled');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Waveform Extraction</Text>

            {/* Extraction controls */}
            {isExtracting ? (
                <View style={styles.progressContainer}>
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text style={styles.progressText}>
                        Extracting: {(progress * 100).toFixed(0)}%
                    </Text>
                    <Button title="Cancel" onPress={cancelExtraction} color="#f44336" />
                </View>
            ) : (
                <Button title="Extract Waveform" onPress={extractWaveform} />
            )}

            {/* Waveform visualization */}
            {waveformData && (
                <View style={styles.resultContainer}>
                    <Text style={styles.resultTitle}>Extracted Waveform</Text>

                    <Waveform
                        path={audioPath}
                        candleSpace={2}
                        candleWidth={4}
                        waveColor="#667eea"
                        scrubColor="#764ba2"
                        style={styles.waveform}
                    />

                    <View style={styles.statsContainer}>
                        <Text style={styles.statText}>
                            Channels: {waveformData.length}
                        </Text>
                        <Text style={styles.statText}>
                            Samples: {waveformData[0].length}
                        </Text>
                    </View>
                </View>
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
        textAlign: 'center',
    },
    progressContainer: {
        alignItems: 'center',
        padding: 24,
    },
    progressText: {
        fontSize: 18,
        marginVertical: 16,
        color: '#666',
    },
    resultContainer: {
        marginTop: 32,
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    waveform: {
        height: 120,
        width: '100%',
        marginBottom: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    statText: {
        fontSize: 14,
        color: '#666',
    },
});
