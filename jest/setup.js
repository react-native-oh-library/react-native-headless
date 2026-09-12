/**
 * Global setup for every test file (jest `setupFiles`).
 *
 * Provides the host globals that react-native code expects so the unit
 * tests can run on plain Node without a device or the real RN runtime.
 * Mirrors the RNOH JS white-box testing setup (rnoh-js-test).
 */

global.nativeModuleProxy = global.nativeModuleProxy || {};

if (typeof global.nativeFabricUIManager === 'undefined') {
  const cache = {};
  global.nativeFabricUIManager = new Proxy(cache, {
    get: function (target, property) {
      if (!(property in target)) {
        target[property] = jest.fn();
      }
      return target[property];
    },
  });
}

if (typeof global.queueMicrotask === 'undefined') {
  global.queueMicrotask = function (callback) {
    return Promise.resolve().then(callback);
  };
}
