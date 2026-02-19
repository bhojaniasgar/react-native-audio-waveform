import { AudioWaveform } from '../AudioWaveform';

/**
 * Hook for managing audio permissions
 * 
 * With Nitro Modules, permission methods are now on the AudioRecorder instance.
 * This hook provides a convenient wrapper that creates a temporary recorder
 * instance to check and request permissions.
 */
export const useAudioPermission = () => {
  const checkHasAudioRecorderPermission = async () => {
    const recorder = AudioWaveform.createRecorder();
    return await recorder.checkHasPermission();
  };

  const getAudioRecorderPermission = async () => {
    const recorder = AudioWaveform.createRecorder();
    return await recorder.getPermission();
  };

  // Note: Audio read permission is Android-specific and not part of the Nitro API
  // For now, we'll return 'granted' as a placeholder
  const checkHasAudioReadPermission = async () => {
    return 'granted';
  };

  const getAudioReadPermission = async () => {
    return 'granted';
  };

  return {
    checkHasAudioRecorderPermission,
    getAudioRecorderPermission,
    checkHasAudioReadPermission,
    getAudioReadPermission,
  };
};
