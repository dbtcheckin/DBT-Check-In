const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const NATIVE_ONLY_MODULES = [
  'react-native-webrtc',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && NATIVE_ONLY_MODULES.includes(moduleName)) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
