const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// Get default config
const config = getDefaultConfig(__dirname, {
  // Use our custom babel config
  babelConfigPath: path.resolve(__dirname, 'babel.config-new.js'),
  // Reset cache
  resetCache: true,
});

// Basic transformer config
config.transformer = {
  ...config.transformer,
  // Disable babel config resolution in transformer
  enableBabelRCLookup: false,
};

// Configure resolver
try {
  // Try to use SVG transformer if available
  config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
} catch (e) {
  // If SVG transformer is not available, continue without it
  console.log('react-native-svg-transformer not found, SVG support will be limited');
}

// Configure asset and source extensions
config.resolver = {
  ...config.resolver,
  assetExts: [...(config.resolver.assetExts || []), 'db', 'sqlite'],
  sourceExts: [...(config.resolver.sourceExts || []), 'jsx', 'js', 'ts', 'tsx'],
};

// Disable caching to prevent issues
config.cacheStores = [];
config.watchFolders = [];
config.resetCache = true;
config.watch = false;

module.exports = config;
