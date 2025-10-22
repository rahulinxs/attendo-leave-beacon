module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@assets': './assets',
            '@lib': './src/lib',
            '@contexts': './src/contexts',
            '@utils': './src/utils',
            '@constants': './src/constants'
          }
        }
      ]
    ]
  };
};
