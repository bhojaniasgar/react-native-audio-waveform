/**
 * Backward Compatibility Example
 * 
 * This example demonstrates how to use the backward compatibility layer
 * to detect Nitro availability and handle different runtime scenarios.
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import {
    AudioWaveform,
    isNitroModulesAvailable,
    getNitroStatus,
    warnDeprecated,
} from '@bhojaniasgar/react-native-audio-waveform';

export default function BackwardCompatibilityExample() {
    const [nitroStatus, setNitroStatus] = useState<any>(null);
    const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

    useEffect(() => {
        // Check Nitro status on mount
        const status = getNitroStatus();
        setNitroStatus(status);

        console.log('[Example] Nitro Status:', status);

        // Log to analytics (example)
        if (status.available) {
            console.log('[Example] ✓ Using high-performance Nitro Modules');
        } else {
            console.warn('[Example] ⚠️  Nitro Modules not available:', status.error);
        }
    }, []);

    const handleCheckStatus = () => {
        const status = getNitroStatus();

        Alert.alert(
            'Nitro Status',
            `Available: ${status.available}\n` +
            `Platform: ${status.platform}\n` +
            `RN Version: ${status.reactNativeVersion || 'Unknown'}\n` +
            `Error: ${status.error || 'None'}`,
            [{ text: 'OK' }]
        );
    };

    const handleTestRecorder = async () => {
        try {
            // Check availability before using
            if (!isNitroModulesAvailable()) {
                Alert.alert(
                    'Feature Unavailable',
                    'Nitro Modules are required for audio recording. ' +
                    'Please ensure you have:\n\n' +
                    '• React Native 0.71.0+\n' +
                    '• iOS 13.0+ or Android API 21+\n' +
                    '• Properly linked native modules',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Create recorder (will work if Nitro is available)
            const recorder = AudioWaveform.createRecorder();

            Alert.alert(
                'Success',
                'Recorder created successfully using Nitro Modules!',
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.message,
                [{ text: 'OK' }]
            );
        }
    };

    const handleBenchmark = async () => {
        if (!isNitroModulesAvailable()) {
            Alert.alert(
                'Benchmark Unavailable',
                'Nitro Modules are required for benchmarking.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            const recorder = AudioWaveform.createRecorder();

            // Benchmark method calls
            const iterations = 1000;
            const start = performance.now();

            for (let i = 0; i < iterations; i++) {
                // This would be a real method call in production
                // await recorder.getDecibel();
            }

            const duration = performance.now() - start;
            const avgTime = duration / iterations;

            const metrics = {
                totalTime: duration.toFixed(2),
                avgTime: avgTime.toFixed(4),
                iterations,
            };

            setPerformanceMetrics(metrics);

            Alert.alert(
                'Benchmark Results',
                `Total: ${metrics.totalTime}ms\n` +
                `Average: ${metrics.avgTime}ms per call\n` +
                `Iterations: ${metrics.iterations}`,
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            Alert.alert('Benchmark Error', error.message, [{ text: 'OK' }]);
        }
    };

    const handleDeprecationExample = () => {
        // Example of using deprecation warnings
        warnDeprecated('oldRecordingAPI', 'AudioWaveform.createRecorder()');

        Alert.alert(
            'Deprecation Warning',
            'Check the console for deprecation warning example.',
            [{ text: 'OK' }]
        );
    };

    const handleGracefulDegradation = () => {
        // Example of graceful degradation
        if (isNitroModulesAvailable()) {
            Alert.alert(
                'Full Features Available',
                'All audio features are available with high performance!',
                [{ text: 'OK' }]
            );
        } else {
            Alert.alert(
                'Limited Features',
                'Some features may be unavailable or slower. ' +
                'Consider upgrading your app to use Nitro Modules.',
                [
                    { text: 'Learn More', onPress: () => console.log('Open docs') },
                    { text: 'OK' },
                ]
            );
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Backward Compatibility</Text>
                <Text style={styles.subtitle}>
                    Demonstrates Nitro detection and graceful degradation
                </Text>
            </View>

            {/* Status Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Nitro Status</Text>
                {nitroStatus ? (
                    <>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Available:</Text>
                            <Text
                                style={[
                                    styles.statusValue,
                                    nitroStatus.available ? styles.success : styles.error,
                                ]}
                            >
                                {nitroStatus.available ? '✓ Yes' : '✗ No'}
                            </Text>
                        </View>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Platform:</Text>
                            <Text style={styles.statusValue}>{nitroStatus.platform}</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>RN Version:</Text>
                            <Text style={styles.statusValue}>
                                {nitroStatus.reactNativeVersion || 'Unknown'}
                            </Text>
                        </View>
                        {nitroStatus.error && (
                            <View style={styles.statusRow}>
                                <Text style={styles.statusLabel}>Error:</Text>
                                <Text style={[styles.statusValue, styles.error]}>
                                    {nitroStatus.error}
                                </Text>
                            </View>
                        )}
                    </>
                ) : (
                    <Text style={styles.statusValue}>Loading...</Text>
                )}
            </View>

            {/* Performance Metrics Card */}
            {performanceMetrics && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Performance Metrics</Text>
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Total Time:</Text>
                        <Text style={styles.statusValue}>
                            {performanceMetrics.totalTime}ms
                        </Text>
                    </View>
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Avg Time:</Text>
                        <Text style={styles.statusValue}>
                            {performanceMetrics.avgTime}ms
                        </Text>
                    </View>
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Iterations:</Text>
                        <Text style={styles.statusValue}>
                            {performanceMetrics.iterations}
                        </Text>
                    </View>
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Detection & Status</Text>

                <TouchableOpacity style={styles.button} onPress={handleCheckStatus}>
                    <Text style={styles.buttonText}>Check Nitro Status</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleGracefulDegradation}
                >
                    <Text style={styles.buttonText}>Test Graceful Degradation</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Feature Testing</Text>

                <TouchableOpacity style={styles.button} onPress={handleTestRecorder}>
                    <Text style={styles.buttonText}>Test Recorder Creation</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleBenchmark}>
                    <Text style={styles.buttonText}>Run Performance Benchmark</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Deprecation Handling</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleDeprecationExample}
                >
                    <Text style={styles.buttonText}>Show Deprecation Warning</Text>
                </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>💡 About This Example</Text>
                <Text style={styles.infoText}>
                    This example demonstrates the backward compatibility layer that
                    ensures smooth upgrades from v1.x to v2.0+.
                </Text>
                <Text style={styles.infoText}>
                    • Automatic Nitro detection{'\n'}
                    • Graceful error handling{'\n'}
                    • Performance monitoring{'\n'}
                    • Deprecation warnings
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
    card: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statusLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    statusValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
        textAlign: 'right',
    },
    success: {
        color: '#4caf50',
        fontWeight: '600',
    },
    error: {
        color: '#f44336',
        fontWeight: '600',
    },
    section: {
        marginHorizontal: 16,
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#2196f3',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    infoCard: {
        backgroundColor: '#e3f2fd',
        margin: 16,
        padding: 16,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#2196f3',
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
        marginBottom: 8,
    },
});
