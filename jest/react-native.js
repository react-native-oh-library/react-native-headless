/**
 * Shared `react-native` manual mock for white-box unit tests.
 *
 * The real react-native package is never loaded by the test suite.
 * Each test file registers this mock with:
 *
 *   jest.mock('react-native', () => require('<rel>/jest/react-native'));
 *
 * The mock is stateful on purpose:
 *  - `Platform.OS` is a live getter/setter, so tests can flip the platform
 *    before re-requiring the module under test (with `jest.resetModules()`),
 *    covering both the harmony and non-harmony branches of src/Headless.js.
 *  - `TurboModuleRegistry.get` is a plain `jest.fn()` tests can configure
 *    per case (return value / undefined / null).
 *
 * Because `jest.resetModules()` re-runs the mock factory, a fresh instance
 * of this module (and therefore fresh mock state) is created for every test.
 */

'use strict';

const platformState = {os: 'android'};

module.exports = {
  Platform: {
    get OS() {
      return platformState.os;
    },
    set OS(value) {
      platformState.os = value;
    },
  },
  NativeModules: {
    HeadlessModule: {
      __nativeModule: 'HeadlessModule',
      startService: jest.fn(),
      stopService: jest.fn(),
      toForeground: jest.fn(),
      toBackground: jest.fn(),
      noLock: jest.fn(),
    },
  },
  TurboModuleRegistry: {
    get: jest.fn(),
  },
};
