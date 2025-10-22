import { DefaultTheme, DarkTheme } from 'react-native-paper';
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { MD3Colors } from 'react-native-paper/lib/typescript/types';

type ThemeType = typeof MD3LightTheme;

declare global {
  namespace ReactNativePaper {
    interface ThemeColors extends MD3Colors {
      // Add any custom colors here
      success: string;
      warning: string;
      info: string;
      backgroundSecondary: string;
      surfaceVariant: string;
    }
  }
}

const fontConfig = {
  displayLarge: {
    fontFamily: 'Roboto-Regular',
    fontSize: 57,
    fontWeight: '400',
    lineHeight: 64,
    letterSpacing: 0,
  },
  displayMedium: {
    fontFamily: 'Roboto-Regular',
    fontSize: 45,
    fontWeight: '400',
    lineHeight: 52,
    letterSpacing: 0,
  },
  displaySmall: {
    fontFamily: 'Roboto-Regular',
    fontSize: 36,
    fontWeight: '400',
    lineHeight: 44,
    letterSpacing: 0,
  },
  headlineLarge: {
    fontFamily: 'Roboto-Regular',
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 40,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontFamily: 'Roboto-Regular',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 36,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontFamily: 'Roboto-Medium',
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 32,
    letterSpacing: 0,
  },
  titleLarge: {
    fontFamily: 'Roboto-Regular',
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 28,
    letterSpacing: 0,
  },
  titleMedium: {
    fontFamily: 'Roboto-Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  bodyLarge: {
    fontFamily: 'Roboto-Regular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  bodyMedium: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  labelLarge: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontFamily: 'Roboto-Medium',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  },
};

const baseTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  roundness: 8,
  animation: {
    scale: 1.0,
  },
};

export const lightTheme: ThemeType = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    primary: '#4A6FA5',
    primaryContainer: '#D6E3FF',
    secondary: '#006A6A',
    secondaryContainer: '#6FF7F7',
    tertiary: '#7D5260',
    tertiaryContainer: '#FFD8E4',
    error: '#B3261E',
    errorContainer: '#F9DEDC',
    background: '#FEFBFF',
    surface: '#FEFBFF',
    surfaceVariant: '#E7E0EC',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onTertiary: '#FFFFFF',
    onError: '#FFFFFF',
    onBackground: '#1C1B1F',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#49454F',
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#A8C7FF',
    elevation: {
      level0: 'transparent',
      level1: 'rgb(247, 243, 249)',
      level2: 'rgb(243, 239, 246)',
      level3: 'rgb(238, 235, 244)',
      level4: 'rgb(237, 233, 243)',
      level5: 'rgb(234, 230, 241)',
    },
    surfaceDisabled: 'rgba(28, 27, 31, 0.12)',
    onSurfaceDisabled: 'rgba(28, 27, 31, 0.38)',
    backdrop: 'rgba(50, 47, 56, 0.4)',
    // Custom colors
    success: '#2E7D32',
    warning: '#ED6C02',
    info: '#0288D1',
    backgroundSecondary: '#F5F5F5',
  },
};

export const darkTheme: ThemeType = {
  ...baseTheme,
  dark: true,
  colors: {
    ...baseTheme.colors,
    primary: '#A8C7FF',
    primaryContainer: '#2F4E7A',
    secondary: '#4CDADA',
    secondaryContainer: '#004F4F',
    tertiary: '#EFB8C8',
    tertiaryContainer: '#633B48',
    error: '#F2B8B5',
    errorContainer: '#8C1D18',
    background: '#1C1B1F',
    surface: '#1C1B1F',
    surfaceVariant: '#49454F',
    onPrimary: '#002E69',
    onSecondary: '#003737',
    onTertiary: '#4A2532',
    onError: '#601410',
    onBackground: '#E6E1E5',
    onSurface: '#E6E1E5',
    onSurfaceVariant: '#CAC4D0',
    outline: '#938F99',
    outlineVariant: '#49454F',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#E6E1E5',
    inverseOnSurface: '#313033',
    inversePrimary: '#4A6FA5',
    elevation: {
      level0: 'transparent',
      level1: 'rgb(37, 35, 42)',
      level2: 'rgb(42, 40, 47)',
      level3: 'rgb(48, 45, 53)',
      level4: 'rgb(50, 47, 54)',
      level5: 'rgb(54, 50, 58)',
    },
    surfaceDisabled: 'rgba(230, 225, 229, 0.12)',
    onSurfaceDisabled: 'rgba(230, 225, 229, 0.38)',
    backdrop: 'rgba(50, 47, 56, 0.4)',
    // Custom colors
    success: '#81C784',
    warning: '#FFB74D',
    info: '#4FC3F7',
    backgroundSecondary: '#121212',
  },
};

export type AppTheme = typeof lightTheme;

// This replaces the default theme in react-native-paper
declare global {
  namespace ReactNativePaper {
    interface Theme extends AppTheme {}
  }
}
