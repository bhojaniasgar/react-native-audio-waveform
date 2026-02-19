import { useRef, useCallback } from 'react';
import { AudioWaveform } from '../AudioWaveform';
import type { AudioRecorder } from '../../specs/AudioRecorder.nitro';
import type { RecordingConfig } from '../../specs/AudioRecorder.nitro';

/**
 * Hook for audio recording functionality using Nitro Modules
 * 
 * This hook provides a simplified interface for audio recording with
 * automatic instance management and cleanup.
 * 
 * @example
 * ```tsx
 * const { startRecording, stopRecording, onDecibelUpdate } = useAudioRecorder();
 * 
 * // Start recording
 * await startRecording({ sampleRate: 44100 });
 * 
 * // Monitor decibel levels
 * onDecibelUpdate((decibel) => {
 *   console.log('Level:', decibel);
 * });
 * 
 * // Stop recording
 * const filePath = await stopRecording();
 * ```
 */
export const useAudioRecorder = () => {
  const recorderRef = useRef<AudioRecorder | null>(null);

  /**
   * Get or create the recorder instance
   */
  const getRecorder = useCallback((): AudioRecorder => {
    if (!recorderRef.current) {
      recorderRef.current = AudioWaveform.createRecorder();
    }
    return recorderRef.current;
  }, []);

  /**
   * Start recording with the specified configuration
   */
  const startRecording = useCallback(async (config?: Partial<RecordingConfig>) => {
    const recorder = getRecorder();
    return recorder.startRecording(config || {});
  }, [getRecorder]);

  /**
   * Stop recording and return the file path
   */
  const stopRecording = useCallback(async () => {
    const recorder = getRecorder();
    return recorder.stopRecording();
  }, [getRecorder]);

  /**
   * Pause the current recording
   */
  const pauseRecording = useCallback(async () => {
    const recorder = getRecorder();
    return recorder.pauseRecording();
  }, [getRecorder]);

  /**
   * Resume a paused recording
   */
  const resumeRecording = useCallback(async () => {
    const recorder = getRecorder();
    return recorder.resumeRecording();
  }, [getRecorder]);

  /**
   * Get the current decibel level
   */
  const getDecibel = useCallback(async () => {
    const recorder = getRecorder();
    return recorder.getDecibel();
  }, [getRecorder]);

  /**
   * Register a callback for real-time decibel updates
   * Uses Nitro's direct JSI callbacks for minimal latency
   */
  const onDecibelUpdate = useCallback((callback: (decibel: number) => void) => {
    const recorder = getRecorder();
    recorder.onDecibelUpdate(callback);
  }, [getRecorder]);

  /**
   * Check if the app has recording permission
   */
  const checkHasPermission = useCallback(async () => {
    const recorder = getRecorder();
    return recorder.checkHasPermission();
  }, [getRecorder]);

  /**
   * Request recording permission
   */
  const getPermission = useCallback(async () => {
    const recorder = getRecorder();
    return recorder.getPermission();
  }, [getRecorder]);

  return {
    checkHasPermission,
    getDecibel,
    getPermission,
    onDecibelUpdate,
    pauseRecording,
    resumeRecording,
    startRecording,
    stopRecording,
  };
};
