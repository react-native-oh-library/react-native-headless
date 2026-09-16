/**
 * White-box unit tests for src/specs/NativeHeadlessModule.ts
 *
 * At runtime the spec file is a single TurboModuleRegistry.get('HeadlessModule')
 * lookup (the `Spec` interface is type-only and stripped by babel). The tests
 * pin down the registered module name and the passthrough of the resolved
 * module, on both the happy path and the not-registered path.
 */

jest.mock('react-native', () => require('../react-native'));

describe('NativeHeadlessModule spec', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('default-exports the module resolved by TurboModuleRegistry', () => {
    const RN = require('react-native');
    const spec = {
      startService: jest.fn(),
      stopService: jest.fn(),
      toForeground: jest.fn(),
      toBackground: jest.fn(),
      noLock: jest.fn(),
    };
    RN.TurboModuleRegistry.get.mockReturnValue(spec);

    const NativeHeadlessModule = require('../../src/specs/NativeHeadlessModule').default;

    expect(RN.TurboModuleRegistry.get).toHaveBeenCalledTimes(1);
    expect(RN.TurboModuleRegistry.get).toHaveBeenCalledWith('HeadlessModule');
    expect(NativeHeadlessModule).toBe(spec);
  });

  it('registers under the module name HeadlessModule', () => {
    const RN = require('react-native');
    RN.TurboModuleRegistry.get.mockReturnValue(null);

    expect(require('../../src/specs/NativeHeadlessModule').default).toBeNull();

    const requestedNames = RN.TurboModuleRegistry.get.mock.calls.map(
      call => call[0],
    );
    expect(requestedNames).toEqual(['HeadlessModule']);
  });
});
