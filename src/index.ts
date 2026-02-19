export {
  Waveform,
  type IWaveformRef,
  type PlaybackSpeedType,
} from './components';
export {
  FinishMode,
  PermissionStatus,
  PlayerState,
  RecorderState,
  UpdateFrequency,
} from './constants';
export { useAudioPermission, useAudioPlayer, useAudioRecorder } from './hooks';
export {
  AudioWaveform,
  isNitroModulesAvailable,
  getNitroStatus,
  warnDeprecated,
} from './AudioWaveform';

// Export Nitro types for TypeScript users
export type { AudioRecorder, RecordingConfig } from '../specs/AudioRecorder.nitro';
export type { AudioPlayer, PlayerConfig } from '../specs/AudioPlayer.nitro';
export type { WaveformExtractor, ExtractionConfig } from '../specs/WaveformExtractor.nitro';
export { DurationType, UpdateFrequency as PlaybackUpdateFrequency } from '../specs/AudioPlayer.nitro';

// Export legacy types for backward compatibility
export type {
  IAudioWaveforms,
  IStartRecording,
  IExtractWaveform,
  IPreparePlayer,
  IStartPlayer,
  IStopPlayer,
  IPausePlayer,
  ISeekPlayer,
  ISetVolume,
  IGetDuration,
  IDidFinishPlayings,
  IOnCurrentDurationChange,
  IOnCurrentExtractedWaveForm,
  IOnCurrentRecordingWaveForm,
  ISetPlaybackSpeed,
} from './types';
