module.exports = function(api) {
  api.cache(true);
  
  // Use NODE_ENV for environment detection
  const isDev = api.env('development');
  
  return {
    presets: [
      'babel-preset-expo',
      [
        '@babel/preset-react',
        {
          runtime: 'automatic',
          development: isDev,
          importSource: 'react',
        },
      ],
      '@babel/preset-typescript',
    ],
    plugins: [
      // Expo Router
      'expo-router/babel',
      
      // Modern JavaScript features
      ['@babel/plugin-transform-runtime', {
        helpers: true,
        regenerator: true,
        useESModules: false,
      }],
      
      // Reanimated plugin (must be listed last)
      'react-native-reanimated/plugin',
      
      // Module resolver for path aliases
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
          alias: {
            '^@/(.+)': './src/\\1',
          },
        },
      ],
    ].filter(Boolean), // Remove any falsy plugins
  };
};
