import React, { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import { Animated, View, StyleSheet, TextStyle, ViewStyle, Platform } from 'react-native';
import { Text } from '../components/ui/Text';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../theme';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default';

type ToastPosition = 'top' | 'bottom' | 'center';

type ToastConfig = {
  /**
   * Duration in milliseconds
   * @default 3000
   */
  duration?: number;
  /**
   * Position of the toast
   * @default 'bottom'
   */
  position?: ToastPosition;
  /**
   * Whether to show the toast with animation
   * @default true
   */
  animated?: boolean;
  /**
   * Whether to show an icon
   * @default true
   */
  showIcon?: boolean;
  /**
   * Custom icon name
   */
  iconName?: string;
  /**
   * Custom styles
   */
  style?: ViewStyle;
  /**
   * Custom text style
   */
  textStyle?: TextStyle;
  /**
   * Custom icon style
   */
  iconStyle?: ViewStyle;
  /**
   * Custom container style
   */
  containerStyle?: ViewStyle;
  /**
   * Callback when toast is shown
   */
  onShow?: () => void;
  /**
   * Callback when toast is hidden
   */
  onHide?: () => void;
};

type ToastOptions = ToastConfig & {
  id: string;
  message: string;
  type: ToastType;
  isVisible: boolean;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType, config?: ToastConfig) => string;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
  updateToast: (id: string, options: Partial<ToastOptions>) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Default configurations for each toast type
const defaultConfigs: Record<ToastType, Omit<ToastConfig, 'duration'>> = {
  success: {
    iconName: 'check-circle',
    position: 'bottom',
    showIcon: true,
  },
  error: {
    iconName: 'alert-circle',
    position: 'bottom',
    showIcon: true,
  },
  warning: {
    iconName: 'alert',
    position: 'bottom',
    showIcon: true,
  },
  info: {
    iconName: 'info',
    position: 'bottom',
    showIcon: true,
  },
  default: {
    position: 'bottom',
    showIcon: false,
  },
};

// Default duration for each toast type
const defaultDurations: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
  default: 3000,
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const [toasts, setToasts] = useState<ToastOptions[]>([]);
  const timeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const animations = useRef<Record<string, Animated.Value>>({});

  // Get styles for toast type
  const getToastStyles = useCallback((type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          iconColor: theme.colors.white,
          textColor: theme.colors.white,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error,
          iconColor: theme.colors.white,
          textColor: theme.colors.white,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning,
          iconColor: theme.colors.white,
          textColor: theme.colors.white,
        };
      case 'info':
        return {
          backgroundColor: theme.colors.info,
          iconColor: theme.colors.white,
          textColor: theme.colors.white,
        };
      default:
        return {
          backgroundColor: theme.colors.surface,
          iconColor: theme.colors.primary,
          textColor: theme.colors.text,
        };
    }
  }, [theme]);

  // Show a toast
  const showToast = useCallback((message: string, type: ToastType = 'default', config: ToastConfig = {}) => {
    const id = Math.random().toString(36).substr(2, 9);
    const defaultConfig = defaultConfigs[type];
    const duration = config.duration || defaultDurations[type] || 3000;
    
    const toast: ToastOptions = {
      id,
      message,
      type,
      isVisible: true,
      duration,
      ...defaultConfig,
      ...config,
    };

    setToasts(prevToasts => [...prevToasts, toast]);
    
    // Initialize animation
    animations.current[id] = new Animated.Value(0);
    
    // Animate in
    Animated.spring(animations.current[id], {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
    
    // Auto-hide after duration
    if (duration > 0) {
      timeouts.current[id] = setTimeout(() => {
        hideToast(id);
      }, duration);
    }
    
    // Call onShow callback
    if (config.onShow) {
      config.onShow();
    }
    
    return id;
  }, []);

  // Hide a toast
  const hideToast = useCallback((id: string) => {
    const toast = toasts.find(t => t.id === id);
    if (!toast) return;
    
    // Animate out
    if (animations.current[id]) {
      Animated.timing(animations.current[id], {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Remove from state after animation
        setToasts(prevToasts => prevToasts.filter(t => t.id !== id));
        
        // Clean up animation
        if (animations.current[id]) {
          animations.current[id].removeAllListeners();
          delete animations.current[id];
        }
      });
    } else {
      // If no animation, just remove
      setToasts(prevToasts => prevToasts.filter(t => t.id !== id));
    }
    
    // Clear timeout
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
    
    // Call onHide callback
    if (toast.onHide) {
      toast.onHide();
    }
  }, [toasts]);

  // Hide all toasts
  const hideAllToasts = useCallback(() => {
    toasts.forEach(toast => hideToast(toast.id));
  }, [toasts, hideToast]);  

  // Update a toast
  const updateToast = useCallback((id: string, options: Partial<ToastOptions>) => {
    setToasts(prevToasts =>
      prevToasts.map(toast =>
        toast.id === id ? { ...toast, ...options } : toast
      )
    );
  }, []);

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      // Clear all timeouts
      Object.values(timeouts.current).forEach(clearTimeout);
      timeouts.current = {};
      
      // Clean up animations
      Object.keys(animations.current).forEach(key => {
        animations.current[key].removeAllListeners();
      });
      animations.current = {};
    };
  }, []);

  // Get position styles
  const getPositionStyles = (position: ToastPosition): ViewStyle => {
    const isWeb = Platform.OS === 'web';
    
    switch (position) {
      case 'top':
        return {
          top: isWeb ? '2%' : 20,
          left: '5%',
          right: '5%',
          position: 'absolute',
          alignItems: 'center',
        };
      case 'center':
        return {
          top: '50%',
          left: '10%',
          right: '10%',
          position: 'absolute',
          alignItems: 'center',
          transform: [{ translateY: -25 }],
        };
      case 'bottom':
      default:
        return {
          bottom: isWeb ? '5%' : 40,
          left: '5%',
          right: '5%',
          position: 'absolute',
          alignItems: 'center',
        };
    }
  };

  // Render a single toast
  const renderToast = (toast: ToastOptions) => {
    const { id, message, type, position = 'bottom', showIcon, iconName } = toast;
    const styles = getToastStyles(type);
    const positionStyles = getPositionStyles(position);
    const animation = animations.current[id] || new Animated.Value(0);
    
    // Animation styles
    const animatedStyle = {
      opacity: animation,
      transform: [
        {
          translateY: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [position === 'bottom' ? 50 : -50, 0],
          }),
        },
      ],
    };
    
    return (
      <Animated.View
        key={id}
        style={[
          styles.toast,
          {
            backgroundColor: styles.backgroundColor,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: 4,
            ...positionStyles,
            ...toast.style,
          },
          animatedStyle,
        ]}
      >
        {showIcon && (
          <Icon
            name={iconName || defaultConfigs[type]?.iconName || 'info'}
            size={24}
            color={styles.iconColor}
            style={[
              {
                marginRight: theme.spacing.sm,
              },
              toast.iconStyle,
            ]}
          />
        )}
        <Text
          style={[
            {
              color: styles.textColor,
              flex: 1,
              textAlign: 'center',
            },
            toast.textStyle,
          ]}
          numberOfLines={3}
        >
          {message}
        </Text>
      </Animated.View>
    );
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        hideToast,
        hideAllToasts,
        updateToast,
      }}
    >
      {children}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'box-none',
          zIndex: theme.zIndices.toast,
        }}
      >
        {toasts.map(renderToast)}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
