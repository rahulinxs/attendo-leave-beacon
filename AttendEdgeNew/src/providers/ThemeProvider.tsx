import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { MD3LightTheme, PaperProvider, adaptNavigationTheme } from 'react-native-paper';
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { lightTheme, darkTheme } from '@theme/theme';
import * as SecureStore from 'expo-secure-store';

type ThemeType = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: typeof lightTheme;
  isDark: boolean;
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const CombinedDefaultTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
  },
};

const CombinedDarkTheme = {
  ...MD3LightTheme,
  ...DarkTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...DarkTheme.colors,
  },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('system');
  const [isDark, setIsDark] = useState(false);
  const [theme, setTheme] = useState(lightTheme);

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await SecureStore.getItemAsync('theme_preference');
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setThemeType(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme preference', error);
      }
    };

    loadThemePreference();
  }, []);

  // Apply theme based on preference
  useEffect(() => {
    const applyTheme = async () => {
      let newIsDark = false;
      
      if (themeType === 'system') {
        newIsDark = systemColorScheme === 'dark';
      } else {
        newIsDark = themeType === 'dark';
      }

      setIsDark(newIsDark);
      setTheme(newIsDark ? darkTheme : lightTheme);

      // Update status bar style
      // StatusBar.setBarStyle(newIsDark ? 'light-content' : 'dark-content');
      
      // Update navigation theme
      // Navigation.setDefaultOptions({
      //   headerStyle: {
      //     backgroundColor: newIsDark ? darkTheme.colors.surface : lightTheme.colors.surface,
      //   },
      //   headerTintColor: newIsDark ? darkTheme.colors.onSurface : lightTheme.colors.onSurface,
      //   headerTitleStyle: {
      //     color: newIsDark ? darkTheme.colors.onSurface : lightTheme.colors.onSurface,
      //   },
      // });
    };

    applyTheme();
  }, [themeType, systemColorScheme]);

  const handleThemeChange = async (type: ThemeType) => {
    try {
      await SecureStore.setItemAsync('theme_preference', type);
      setThemeType(type);
    } catch (error) {
      console.error('Failed to save theme preference', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        themeType,
        setThemeType: handleThemeChange,
      }}
    >
      <PaperProvider theme={theme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
