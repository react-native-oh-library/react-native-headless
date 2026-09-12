/**
 * White-box unit tests for the package entry points:
 *  - src/index.js (published module entry, default + named export)
 *  - index.js at the package root (backward-compatible entry for tooling)
 */

jest.mock('react-native', () => require('../../jest/react-native'));

describe('src/index', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('exports the Headless native module as default', () => {
    const RN = require('react-native');
    RN.Platform.OS = 'android';

    const index = require('../../src/index');

    expect(index.default).toBe(RN.NativeModules.HeadlessModule);
  });

  it('exports the same module under the named export Headless', () => {
    const RN = require('react-native');
    RN.Platform.OS = 'android';

    const index = require('../../src/index');

    expect(index.Headless).toBe(RN.NativeModules.HeadlessModule);
    expect(index.Headless).toBe(index.default);
  });
});

describe('package root index', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('re-exports src/index.js directly', () => {
    const RN = require('react-native');
    RN.Platform.OS = 'android';

    const rootEntry = require('../../index');
    const srcEntry = require('../../src/index');

    expect(rootEntry).toBe(srcEntry);
  });

  it('exposes the harmony TurboModule through both entries', () => {
    const RN = require('react-native');
    RN.Platform.OS = 'harmony';
    const turboModule = {__turboModule: 'HeadlessModule'};
    RN.TurboModuleRegistry.get.mockReturnValue(turboModule);

    const rootEntry = require('../../index');

    expect(rootEntry.default).toBe(turboModule);
    expect(rootEntry.Headless).toBe(turboModule);
  });
});
