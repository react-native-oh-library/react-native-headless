import {NativeModules, Platform} from 'react-native';

function getHeadless() {
  if (Platform.OS === 'harmony') {
    const {TurboModuleRegistry} = require('react-native');
    return TurboModuleRegistry.get('HeadlessModule');
  }
  return NativeModules.HeadlessModule;
}

const Headless = getHeadless();

export default Headless;
