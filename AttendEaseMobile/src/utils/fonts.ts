import * as Font from 'expo-font';

export const loadFonts = async () => {
  await Font.loadAsync({
    'cambria': {
      uri: require('../assets/fonts/Cambria.ttf'),
      display: Font.FontDisplay.FALLBACK,
    },
    'cambria-bold': {
      uri: require('../assets/fonts/Cambria-Bold.ttf'),
      display: Font.FontDisplay.FALLBACK,
    },
  });
};
