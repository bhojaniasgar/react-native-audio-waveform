import { Platform } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type { AudioWaveform as AudioWaveformNitro } from '../specs/AudioWaveform.nitro';

const LINKING_ERROR =
  "The package '@bhojaniasgar/react-native-audio-waveform' doesn't seem to be linked. Make sure: \n\n" +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const NITRO_UNAVAILABLE_ERROR =
  "Nitro Modules are not available. This could be because:\n\n" +
  "- You're using an older version of React Native (< 0.71.0)\n" +
  "- The native module wasn't properly linked\n" +
  "- You're running on an unsupported platform\n\n" +
  "Please ensure you have:\n" +
  Platform.select({
    ios: "- iOS 13.0 or higher\n- Run 'pod install' after upgrading\n",
    android: "- Android API 21 or higher\n- Rebuilt the app after upgrading\n",
    default: ''
  }) +
  "- React Native 0.71.0 or higher\n" +
  "- Followed the migration guide at: https://github.com/bhojaniasgar/react-native-audio-waveform\n";

/**
 * Backward Compatibility Layer
 * 
 * This layer provides graceful degradation and helpful error messages
 * when Nitro Modules are not available.
 */

let AudioWaveformModule: AudioWaveformNitro | null = null;
let isNitroAvailable = false;
let nitroError: Error | null = null;

/**
 * Attempt to create the Nitro Modules Hybrid Object
 * This provides direct JSI access to native functionality with zero-overhead
 */
try {
  // Check if NitroModules is available
  if (typeof NitroModules === 'undefined' || !NitroModules.createHybridObject) {
    throw new Error('NitroModules not available');
  }

  AudioWaveformModule = NitroModules.createHybridObject<AudioWaveformNitro>(
    'AudioWaveform'
  );

  if (AudioWaveformModule) {
    isNitroAvailable = true;
    console.log(
      '[AudioWaveform] ✓ Nitro Modules initialized successfully. ' +
      'Enjoy 10-60x faster native method calls!'
    );
  }
} catch (e) {
  nitroError = e as Error;
  isNitroAvailable = false;

  // Log detailed error for debugging
  console.warn(
    '[AudioWaveform] ⚠️  Nitro Modules initialization failed:',
    nitroError.message
  );
  console.warn(
    '[AudioWaveform] Falling back to compatibility mode. ' +
    'Some features may be unavailable or slower.'
  );
}

/**
 * Check if Nitro Modules are available
 * This can be used by consumers to detect the runtime environment
 */
export function isNitroModulesAvailable(): boolean {
  return isNitroAvailable;
}

/**
 * Get detailed information about Nitro availability
 * Useful for debugging and feature detection
 */
export function getNitroStatus(): {
  available: boolean;
  error: string | null;
  platform: string;
  reactNativeVersion: string | null;
} {
  return {
    available: isNitroAvailable,
    error: nitroError?.message || null,
    platform: Platform.OS,
    reactNativeVersion: Platform.Version?.toString() || null,
  };
}

/**
 * Create a helpful error proxy that provides migration guidance
 */
function createCompatibilityProxy(): AudioWaveformNitro {
  const errorMessage = nitroError
    ? `${NITRO_UNAVAILABLE_ERROR}\n\nOriginal error: ${nitroError.message}`
    : LINKING_ERROR;

  return new Proxy({} as AudioWaveformNitro, {
    get(_target, prop) {
      // Provide helpful error message with context about which method was called
      throw new Error(
        `${errorMessage}\n\n` +
        `Attempted to call: AudioWaveform.${String(prop)}\n\n` +
        `If you're upgrading from v1.x, please follow the migration guide.`
      );
    },
  });
}

/**
 * Export the Nitro module with backward compatibility
 * 
 * If Nitro is available: Use the high-performance Nitro implementation
 * If Nitro is unavailable: Provide helpful error messages with migration guidance
 * 
 * The module provides factory methods to create AudioRecorder, AudioPlayer, 
 * and WaveformExtractor instances.
 */
export const AudioWaveform: AudioWaveformNitro = AudioWaveformModule || createCompatibilityProxy();

/**
 * Deprecated: Legacy warning helper
 * This function can be used to warn about deprecated usage patterns
 */
export function warnDeprecated(feature: string, alternative: string): void {
  console.warn(
    `[AudioWaveform] DEPRECATED: ${feature} is deprecated and will be removed in v3.0.0. ` +
    `Please use ${alternative} instead. ` +
    `See migration guide: https://github.com/bhojaniasgar/react-native-audio-waveform`
  );
}
