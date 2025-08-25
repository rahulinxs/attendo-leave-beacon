import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
  Dimensions,
  I18nManager,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import Text from './Text';
import Icon from 'react-native-vector-icons/Ionicons';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'default';
type ToastPosition = 'top' | 'bottom' | 'center';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  position?: ToastPosition;
  duration?: number;
  onDismiss?: () => void;
  onPress?: () => void;
  showIcon?: boolean;
  showCloseButton?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconName?: string;
  iconSize?: number;
  iconColor?: string;
  animationDuration?: number;
  animationType?: 'slide' | 'scale' | 'fade';
  renderCustomContent?: () => React.ReactNode;
  testID?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_WIDTH = SCREEN_WIDTH - 40;
const DEFAULT_DURATION = 3000;
const ANIMATION_DURATION = 250;

const Toast: React.FC<ToastProps> = ({
  visible = false,
  message,
  type = 'default',
  position = 'bottom',
  duration = DEFAULT_DURATION,
  onDismiss,
  onPress,
  showIcon = true,
  showCloseButton = true,
  style,
  textStyle,
  iconName,
  iconSize = 24,
  iconColor,
  animationDuration = ANIMATION_DURATION,
  animationType = 'slide',
  renderCustomContent,
  testID,
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const insets = useSafeAreaInsets();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          icon: 'checkmark-circle',
          iconColor: iconColor || theme.colors.white,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error,
          icon: 'alert-circle',
          iconColor: iconColor || theme.colors.white,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning,
          icon: 'warning',
          iconColor: iconColor || theme.colors.text,
        };
      case 'info':
        return {
          backgroundColor: theme.colors.info,
          icon: 'information-circle',
          iconColor: iconColor || theme.colors.white,
        };
      case 'default':
      default:
        return {
          backgroundColor: theme.colors.background,
          icon: 'notifications',
          iconColor: iconColor || theme.colors.primary,
        };
    }
  };

  const getPositionStyles = () => {
    const baseStyle = {
      position: 'absolute',
      left: 20,
      right: 20,
      zIndex: theme.zIndices.toast,
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          top: insets.top + 20,
        };
      case 'center':
        return {
          ...baseStyle,
          top: '50%',
          marginTop: -25, // Approximate half of toast height
        };
      case 'bottom':
      default:
        return {
          ...baseStyle,
          bottom: insets.bottom + 20,
        };
    }
  };

  const getAnimation = () => {
    const inputRange = [0, 1];
    const outputRange = [0, 1];

    switch (animationType) {
      case 'slide':
        const translateY = animatedValue.interpolate({
          inputRange,
          outputRange: position === 'bottom' ? [100, 0] : [-100, 0],
        });
        return {
          opacity: animatedValue,
          transform: [{ translateY }],
        };
      case 'scale':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        };
      case 'fade':
      default:
        return {
          opacity: animatedValue,
        };
    }
  };

  const show = () => {
    setIsVisible(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (duration !== 0) {
      timerRef.current = setTimeout(() => {
        hide();
      }, duration);
    }
  };

  const hide = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: animationDuration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    hide();
  };

  const handleClose = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    hide();
  };

  useEffect(() => {
    if (visible) {
      show();
    } else {
      hide();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible]);

  if (!isVisible) return null;

  const typeStyles = getTypeStyles();
  const positionStyles = getPositionStyles();
  const animation = getAnimation();

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: typeStyles.backgroundColor,
          ...positionStyles,
        },
        animation,
        style,
      ]}
      testID={testID}
    >
      <Container
        style={styles.content}
        activeOpacity={0.9}
        onPress={onPress ? handlePress : undefined}
      >
        {showIcon && (
          <Icon
            name={iconName || typeStyles.icon}
            size={iconSize}
            color={typeStyles.iconColor}
            style={styles.icon}
          />
        )}
        <View style={styles.textContainer}>
          {typeof message === 'string' ? (
            <Text
              style={[
                styles.text,
                { color: type === 'warning' ? theme.colors.text : theme.colors.white },
                textStyle,
              ]}
              numberOfLines={3}
            >
              {message}
            </Text>
          ) : (
            message
          )}
          {renderCustomContent && renderCustomContent()}
        </View>
        {showCloseButton && (
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon
              name="close"
              size={20}
              color={type === 'warning' ? theme.colors.text : theme.colors.white}
            />
          </TouchableOpacity>
        )}
      </Container>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: TOAST_WIDTH,
    borderRadius: theme.borderRadius.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  text: {
    color: theme.colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    margin: -4,
  },
});

// Toast context and hook for global usage
const ToastContext = React.createContext<{
  show: (options: Omit<ToastProps, 'visible'>) => void;
  hide: () => void;
} | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastProps, setToastProps] = useState<Omit<ToastProps, 'visible'>>({
    message: '',
  });
  const [visible, setVisible] = useState(false);

  const show = (options: Omit<ToastProps, 'visible'>) => {
    setToastProps(options);
    setVisible(true);
  };

  const hide = () => {
    setVisible(false);
  };

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      <Toast
        visible={visible}
        onDismiss={hide}
        {...toastProps}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default Toast;
