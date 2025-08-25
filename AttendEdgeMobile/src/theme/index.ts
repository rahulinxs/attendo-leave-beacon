// Types
type ColorPalette = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryLightest: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  background: string;
  backgroundLight: string;
  backgroundDark: string;
  surface: string;
  surfaceLight: string;
  surfaceDark: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  success: string;
  successLight: string;
  successDark: string;
  warning: string;
  warningLight: string;
  warningDark: string;
  error: string;
  errorLight: string;
  errorDark: string;
  info: string;
  infoLight: string;
  infoDark: string;
  border: string;
  borderLight: string;
  borderDark: string;
  divider: string;
  overlay: string;
  shadow: string;
  disabled: string;
  disabledText: string;
  white: string;
  black: string;
  transparent: string;
};

type Spacing = {
  none: number;
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
};

type BorderRadius = {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  round: number;
};

type Typography = {
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  h4: TextStyle;
  h5: TextStyle;
  h6: TextStyle;
  subtitle1: TextStyle;
  subtitle2: TextStyle;
  body1: TextStyle;
  body2: TextStyle;
  button: TextStyle;
  caption: TextStyle;
  overline: TextStyle;
};

type Shadows = {
  none: ShadowStyleIOS;
  sm: ShadowStyleIOS;
  md: ShadowStyleIOS;
  lg: ShadowStyleIOS;
  xl: ShadowStyleIOS;
};

type ZIndices = {
  dropdown: number;
  sticky: number;
  fixed: number;
  modalBackdrop: number;
  modal: number;
  popover: number;
  tooltip: number;
  toast: number;
};

type Theme = {
  colors: ColorPalette;
  spacing: Spacing;
  borderRadius: BorderRadius;
  typography: Typography;
  shadows: Shadows;
  zIndices: ZIndices;
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  animation: {
    fast: number;
    normal: number;
    slow: number;
  };
  opacity: {
    disabled: number;
    inactive: number;
    active: number;
  };
};

// Theme implementation
export const theme: Theme = {
  colors: {
    // Primary brand colors
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    primaryLight: '#3b82f6',
    primaryLightest: '#eff6ff',
    
    // Secondary colors
    secondary: '#7c3aed',
    secondaryDark: '#6d28d9',
    secondaryLight: '#8b5cf6',
    
    // Background colors
    background: '#ffffff',
    backgroundLight: '#f8fafc',
    backgroundDark: '#f1f5f9',
    
    // Surface colors
    surface: '#ffffff',
    surfaceLight: '#f8fafc',
    surfaceDark: '#f1f5f9',
    
    // Text colors
    text: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
    
    // Status colors
    success: '#10b981',
    successLight: '#d1fae5',
    successDark: '#059669',
    
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    warningDark: '#d97706',
    
    error: '#ef4444',
    errorLight: '#fee2e2',
    errorDark: '#dc2626',
    
    info: '#3b82f6',
    infoLight: '#dbeafe',
    infoDark: '#2563eb',
    
    // Border colors
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    borderDark: '#cbd5e1',
    
    // Divider
    divider: '#e2e8f0',
    
    // Other
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    disabled: '#e2e8f0',
    disabledText: '#94a3b8',
    
    // Basic colors
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
  },
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  borderRadius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    round: 9999,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
      lineHeight: 40,
    },
    h2: {
      fontSize: 28,
      fontWeight: 'bold',
      lineHeight: 36,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      lineHeight: 20,
      color: '#64748b',
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  divider: '#e2e8f0',
} as const;


// Export the theme object as default
export default theme;
