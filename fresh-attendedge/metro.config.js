const { getDefaultConfig } = require('expo/metro-config');

// Get the default Metro config
const config = getDefaultConfig(__dirname);

// Add support for SVG files
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

// Update the asset and source extensions
config.resolver.assetExts = [
  ...config.resolver.assetExts.filter(ext => ext !== 'svg'),
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg'
];

config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'svg'
];

// Ensure we're watching all of the project files
config.watchFolders = [__dirname];

module.exports = config;
