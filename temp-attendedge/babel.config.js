// Check if this config has already been run
try {
  module.exports = function(api) {
    // This will throw if cache is already configured
    api.cache.never();
    
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // Add any required plugins here
        'react-native-reanimated/plugin'
      ]
    };
  };
} catch (error) {
  // If we get here, the cache was already configured
  module.exports = {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin'
    ]
  };
}
