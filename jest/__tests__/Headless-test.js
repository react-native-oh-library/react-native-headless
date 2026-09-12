/**
 * White-box unit tests for src/Headless.js
 *
 * Headless resolves the native module at import time:
 *  - harmony  -> TurboModuleRegistry.get('HeadlessModule')
 *  - others   -> NativeModules.HeadlessModule
 * Both branches (and the degraded cases) are covered by re-requiring the
 * module with a different mocked Platform.OS.
 */

jest.mock('react-native', () => require('../react-native'));

function loadReactNative(platform) {
  const RN = require('react-native');
  RN.Platform.OS = platform;
  return RN;
}

describe('Headless', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('on non-harmony platforms', () => {
    ['android', 'ios'].forEach(os => {
      it(`returns NativeModules.HeadlessModule on ${os}`, () => {
        const RN = loadReactNative(os);

        const Headless = require('../../src/Headless').default;

        expect(Headless).toBe(RN.NativeModules.HeadlessModule);
        expect(RN.TurboModuleRegistry.get).not.toHaveBeenCalled();
      });
    });

    it('falls back to NativeModules when the platform is unknown', () => {
      const RN = loadReactNative('windows');

      expect(require('../../src/Headless').default).toBe(
        RN.NativeModules.HeadlessModule,
      );
    });

    it('is undefined when NativeModules.HeadlessModule is not registered', () => {
      const RN = loadReactNative('android');
      RN.NativeModules.HeadlessModule = undefined;

      expect(require('../../src/Headless').default).toBeUndefined();
    });
  });

  describe('on harmony', () => {
    it('returns the module resolved from TurboModuleRegistry', () => {
      const RN = loadReactNative('harmony');
      const turboModule = {__turboModule: 'HeadlessModule'};
      RN.TurboModuleRegistry.get.mockReturnValue(turboModule);

      const Headless = require('../../src/Headless').default;

      expect(RN.TurboModuleRegistry.get).toHaveBeenCalledTimes(1);
      expect(RN.TurboModuleRegistry.get).toHaveBeenCalledWith('HeadlessModule');
      expect(Headless).toBe(turboModule);
    });

    it('does not read NativeModules.HeadlessModule', () => {
      const RN = loadReactNative('harmony');
      RN.NativeModules.HeadlessModule = undefined;
      const turboModule = {__turboModule: 'HeadlessModule'};
      RN.TurboModuleRegistry.get.mockReturnValue(turboModule);

      expect(require('../../src/Headless').default).toBe(turboModule);
    });

    it('is undefined when the TurboModule is not registered', () => {
      const RN = loadReactNative('harmony');
      RN.TurboModuleRegistry.get.mockReturnValue(undefined);

      expect(require('../../src/Headless').default).toBeUndefined();
    });
  });
});
