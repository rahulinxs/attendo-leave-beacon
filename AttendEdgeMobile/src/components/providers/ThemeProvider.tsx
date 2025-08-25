import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme, StatusBar, StatusBarStyle } from 'react-native';
import { theme, Theme } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_mode';

// Default theme colors for light mode
const lightColors: Theme['colors'] = {
  ...theme.colors,
  // Override any theme colors for light mode
  background: '#ffffff',
  backgroundLight: '#f8fafc',
  backgroundDark: '#f1f5f9',
  surface: '#ffffff',
  surfaceLight: '#f8fafc',
  surfaceDark: '#f1f5f9',
  text: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderDark: '#cbd5e1',
  divider: '#e2e8f0',
  disabled: '#e2e8f0',
  disabledText: '#94a3b8',
};

// Dark theme colors
const darkColors: Theme['colors'] = {
  ...theme.colors,
  // Override theme colors for dark mode
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primaryLight: '#60a5fa',
  primaryLightest: '#1e3a8a',
  
  secondary: '#8b5cf6',
  secondaryDark: '#7c3aed',
  secondaryLight: '#a78bfa',
  
  background: '#0f172a',
  backgroundLight: '#1e293b',
  backgroundDark: '#0f172a',
  
  surface: '#1e293b',
  surfaceLight: '#334155',
  surfaceDark: '#0f172a',
  
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textInverse: '#0f172a',
  
  success: '#10b981',
  successLight: '#064e3b',
  successDark: '#059669',
  
  warning: '#f59e0b',
  warningLight: '#78350f',
  warningDark: '#d97706',
  
  error: '#ef4444',
  errorLight: '#7f1d1d',
  errorDark: '#dc2626',
  
  info: '#3b82f6',
  infoLight: '#1e3a8a',
  infoDark: '#2563eb',
  
  border: '#334155',
  borderLight: '#1e293b',
  borderDark: '#0f172a',
  
  divider: '#334155',
  disabled: '#334155',
  disabledText: '#64748b',
  
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

interface ThemeProviderProps {
  children: React.ReactNode;
  initialThemeMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialThemeMode = 'system',
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialThemeMode);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
        if (savedThemeMode) {
          setThemeModeState(savedThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme preference', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemePreference();
  }, []);

  // Save theme preference to storage
  const saveThemePreference = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference', error);
    }
  };

  // Set theme mode and save preference
  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await saveThemePreference(mode);
  };

  // Toggle between light and dark theme
  const toggleTheme = async () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    await setThemeMode(newMode);
  };

  // Determine if we should use dark theme based on theme mode and system preference
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  // Create the theme object based on the current mode
  const currentTheme = useMemo(() => {
    const colors = isDark ? darkColors : lightColors;
    
    return {
      ...theme,
      colors: {
        ...theme.colors,
        ...colors,
      },
    };
  }, [isDark]);

  // Update status bar style based on theme
  useEffect(() => {
    const statusBarStyle: StatusBarStyle = isDark ? 'light-content' : 'dark-content';
    StatusBar.setBarStyle(statusBarStyle);
    
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, [isDark]);

  // Don't render until theme is loaded to avoid flash of incorrect theme
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        themeMode,
        isDark,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Higher-order component to inject theme props
// eslint-disable-next-line @typescript-eslint/ban-types
export const withTheme = <P extends object>(
  WrappedComponent: React.ComponentType<P & { theme: Theme }>
) => {
  const WithTheme: React.FC<P> = (props) => {
    const { theme } = useTheme();
    return <WrappedComponent {...props} theme={theme} />;
  };
  return WithTheme;
};

export default ThemeProvider;
