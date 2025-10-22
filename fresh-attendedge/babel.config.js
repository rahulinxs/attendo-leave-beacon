module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Use worklets plugin with a unique name to prevent conflicts
      ['react-native-worklets/plugin', {}, 'unique-worklets-plugin'],
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './screens',
            '@assets': './assets',
            '@lib': './lib',
            '@contexts': './contexts'
          }
        }
      ]
    ]
  };
};
