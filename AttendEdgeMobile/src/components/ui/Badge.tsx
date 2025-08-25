import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../../../theme';
import Text from './Text';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'outline';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  dot?: boolean;
  max?: number;
  count?: number;
  showZero?: boolean;
  showCount?: boolean;
  onPress?: () => void;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  dot = false,
  max = 99,
  count,
  showZero = false,
  showCount = false,
  onPress,
}) => {
  const isCountBadge = count !== undefined;
  const showBadge = isCountBadge ? (count > 0 || showZero) : true;
  
  if (!showBadge && !children) return null;

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    const baseContainer: ViewStyle = {
      backgroundColor: theme.colors.primary,
      borderWidth: 1,
      borderColor: 'transparent',
    };
    
    const baseText: TextStyle = {
      color: theme.colors.white,
    };

    switch (variant) {
      case 'primary':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.primary,
          },
          text: {
            ...baseText,
            color: theme.colors.white,
          },
        };
      case 'secondary':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.secondary,
          },
          text: {
            ...baseText,
            color: theme.colors.white,
          },
        };
      case 'success':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.success,
          },
          text: {
            ...baseText,
            color: theme.colors.white,
          },
        };
      case 'error':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.error,
          },
          text: {
            ...baseText,
            color: theme.colors.white,
          },
        };
      case 'warning':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.warning,
          },
          text: {
            ...baseText,
            color: theme.colors.text,
          },
        };
      case 'info':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.info,
          },
          text: {
            ...baseText,
            color: theme.colors.white,
          },
        };
      case 'outline':
        return {
          container: {
            ...baseContainer,
            backgroundColor: 'transparent',
            borderColor: theme.colors.primary,
          },
          text: {
            ...baseText,
            color: theme.colors.primary,
          },
        };
      default:
        return { container: baseContainer, text: baseText };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingHorizontal: 4,
            paddingVertical: 2,
            minWidth: 20,
            height: 20,
          },
          text: {
            fontSize: 10,
            lineHeight: 16,
          },
          dot: {
            width: 8,
            height: 8,
            borderRadius: 4,
          },
        };
      case 'lg':
        return {
          container: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            minWidth: 28,
            height: 28,
          },
          text: {
            fontSize: 14,
            lineHeight: 20,
          },
          dot: {
            width: 12,
            height: 12,
            borderRadius: 6,
          },
        };
      case 'md':
      default:
        return {
          container: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            minWidth: 24,
            height: 24,
          },
          text: {
            fontSize: 12,
            lineHeight: 18,
          },
          dot: {
            width: 10,
            height: 10,
            borderRadius: 5,
          },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const containerStyle: ViewStyle = {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    ...variantStyles.container,
    ...sizeStyles.container,
    ...(dot && {
      ...sizeStyles.dot,
      padding: 0,
      minWidth: sizeStyles.dot.width,
      height: sizeStyles.dot.height,
      alignItems: 'center',
      justifyContent: 'center',
    }),
    ...style,
  };

  const textStyle: TextStyle = {
    ...variantStyles.text,
    ...sizeStyles.text,
    ...textStyle,
    ...(dot && {
      display: 'none',
    }),
  };

  const renderContent = () => {
    if (dot) {
      return null;
    }

    if (isCountBadge && showCount) {
      const displayCount = count > max ? `${max}+` : count;
      return (
        <Text style={textStyle} weight="medium">
          {displayCount}
        </Text>
      );
    }

    if (typeof children === 'string' || typeof children === 'number') {
      return (
        <Text style={textStyle} weight="medium">
          {children}
        </Text>
      );
    }

    return children;
  };

  const Container = onPress ? require('react-native').TouchableOpacity : View;

  return (
    <Container
      style={containerStyle}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      {renderContent()}
    </Container>
  );
};

export default Badge;
