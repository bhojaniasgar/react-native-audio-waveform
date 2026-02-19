/**
 * Backward Compatibility Layer Tests
 * 
 * Tests the fallback behavior when Nitro Modules are not available
 */

import { Platform } from 'react-native';

// Mock react-native-nitro-modules before importing AudioWaveform
jest.mock('react-native-nitro-modules', () => ({
    NitroModules: {
        createHybridObject: jest.fn(),
    },
}));

describe('Backward Compatibility Layer', () => {
    let AudioWaveform: any;
    let isNitroModulesAvailable: any;
    let getNitroStatus: any;
    let warnDeprecated: any;
    let NitroModules: any;

    beforeEach(() => {
        // Clear module cache to get fresh imports
        jest.resetModules();
        jest.clearAllMocks();

        // Suppress console warnings during tests
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('when Nitro Modules are available', () => {
        beforeEach(() => {
            // Mock successful Nitro initialization
            const mockHybridObject = {
                createRecorder: jest.fn(),
                createPlayer: jest.fn(),
                createExtractor: jest.fn(),
                stopAllPlayers: jest.fn(),
                stopAllExtractors: jest.fn(),
            };

            NitroModules = require('react-native-nitro-modules').NitroModules;
            NitroModules.createHybridObject.mockReturnValue(mockHybridObject);

            // Import after mocking
            const module = require('../src/AudioWaveform');
            AudioWaveform = module.AudioWaveform;
            isNitroModulesAvailable = module.isNitroModulesAvailable;
            getNitroStatus = module.getNitroStatus;
        });

        it('should successfully initialize Nitro Modules', () => {
            expect(NitroModules.createHybridObject).toHaveBeenCalledWith('AudioWaveform');
            expect(isNitroModulesAvailable()).toBe(true);
        });

        it('should log success message', () => {
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Nitro Modules initialized successfully')
            );
        });

        it('should provide access to factory methods', () => {
            expect(AudioWaveform.createRecorder).toBeDefined();
            expect(AudioWaveform.createPlayer).toBeDefined();
            expect(AudioWaveform.createExtractor).toBeDefined();
        });

        it('should report available status', () => {
            const status = getNitroStatus();
            expect(status.available).toBe(true);
            expect(status.error).toBeNull();
            expect(status.platform).toBe(Platform.OS);
        });
    });

    describe('when Nitro Modules are not available', () => {
        beforeEach(() => {
            // Mock failed Nitro initialization
            NitroModules = require('react-native-nitro-modules').NitroModules;
            NitroModules.createHybridObject.mockImplementation(() => {
                throw new Error('NitroModules not available');
            });

            // Import after mocking
            const module = require('../src/AudioWaveform');
            AudioWaveform = module.AudioWaveform;
            isNitroModulesAvailable = module.isNitroModulesAvailable;
            getNitroStatus = module.getNitroStatus;
        });

        it('should detect Nitro unavailability', () => {
            expect(isNitroModulesAvailable()).toBe(false);
        });

        it('should log warning message', () => {
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Nitro Modules initialization failed'),
                expect.any(String)
            );
        });

        it('should throw helpful error when accessing methods', () => {
            expect(() => {
                AudioWaveform.createRecorder();
            }).toThrow(/Nitro Modules are not available/);
        });

        it('should include method name in error message', () => {
            expect(() => {
                AudioWaveform.createPlayer('test');
            }).toThrow(/createPlayer/);
        });

        it('should report unavailable status with error', () => {
            const status = getNitroStatus();
            expect(status.available).toBe(false);
            expect(status.error).toContain('NitroModules not available');
            expect(status.platform).toBe(Platform.OS);
        });

        it('should provide migration guidance in error', () => {
            expect(() => {
                AudioWaveform.createExtractor('test');
            }).toThrow(/migration guide/);
        });
    });

    describe('when NitroModules returns null', () => {
        beforeEach(() => {
            // Mock Nitro returning null
            NitroModules = require('react-native-nitro-modules').NitroModules;
            NitroModules.createHybridObject.mockReturnValue(null);

            // Import after mocking
            const module = require('../src/AudioWaveform');
            AudioWaveform = module.AudioWaveform;
            isNitroModulesAvailable = module.isNitroModulesAvailable;
        });

        it('should detect Nitro unavailability', () => {
            expect(isNitroModulesAvailable()).toBe(false);
        });

        it('should throw error when accessing methods', () => {
            expect(() => {
                AudioWaveform.stopAllPlayers();
            }).toThrow();
        });
    });

    describe('deprecation warnings', () => {
        beforeEach(() => {
            // Mock successful Nitro initialization for deprecation tests
            const mockHybridObject = {
                createRecorder: jest.fn(),
            };

            NitroModules = require('react-native-nitro-modules').NitroModules;
            NitroModules.createHybridObject.mockReturnValue(mockHybridObject);

            // Import after mocking
            const module = require('../src/AudioWaveform');
            warnDeprecated = module.warnDeprecated;
        });

        it('should warn about deprecated features', () => {
            warnDeprecated('oldMethod', 'newMethod');

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('DEPRECATED: oldMethod')
            );
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Please use newMethod')
            );
        });

        it('should include version information in deprecation warning', () => {
            warnDeprecated('legacyAPI', 'modernAPI');

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('v3.0.0')
            );
        });

        it('should include migration guide link', () => {
            warnDeprecated('oldFeature', 'newFeature');

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('migration guide')
            );
        });
    });

    describe('platform-specific error messages', () => {
        beforeEach(() => {
            NitroModules = require('react-native-nitro-modules').NitroModules;
            NitroModules.createHybridObject.mockImplementation(() => {
                throw new Error('Native module not found');
            });

            // Import after mocking
            const module = require('../src/AudioWaveform');
            AudioWaveform = module.AudioWaveform;
        });

        it('should include platform-specific instructions in error', () => {
            try {
                AudioWaveform.createRecorder();
            } catch (error: any) {
                if (Platform.OS === 'ios') {
                    expect(error.message).toContain('pod install');
                    expect(error.message).toContain('iOS 13.0');
                } else if (Platform.OS === 'android') {
                    expect(error.message).toContain('Android API 21');
                }
            }
        });

        it('should mention React Native version requirement', () => {
            try {
                AudioWaveform.createPlayer('test');
            } catch (error: any) {
                expect(error.message).toContain('React Native 0.71.0');
            }
        });
    });

    describe('getNitroStatus', () => {
        it('should return complete status information', () => {
            // Mock successful initialization
            NitroModules = require('react-native-nitro-modules').NitroModules;
            NitroModules.createHybridObject.mockReturnValue({
                createRecorder: jest.fn(),
            });

            const module = require('../src/AudioWaveform');
            const status = module.getNitroStatus();

            expect(status).toHaveProperty('available');
            expect(status).toHaveProperty('error');
            expect(status).toHaveProperty('platform');
            expect(status).toHaveProperty('reactNativeVersion');
            expect(typeof status.available).toBe('boolean');
            expect(status.platform).toBe(Platform.OS);
        });
    });
});
