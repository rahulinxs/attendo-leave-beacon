import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { theme } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconSize?: number;
  children?: ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  iconColor,
  iconSize = 20,
  children,
}) => {
  const isDisabled = disabled || loading;
  const hasIcon = !!icon || !!leftIcon || !!rightIcon;
  const showLeftIcon = (icon && iconPosition === 'left') || leftIcon;
  const showRightIcon = (icon && iconPosition === 'right') || rightIcon;
  const iconName = (icon || leftIcon || rightIcon) as keyof typeof Ionicons.glyphMap;
  
  const getButtonStyle = () => {
    const baseStyle: ViewStyle = {
      backgroundColor: theme.colors.primary,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.m,
      paddingVertical: theme.spacing.m,
      paddingHorizontal: theme.spacing.l,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: isDisabled ? 0.6 : 1,
      width: fullWidth ? '100%' : 'auto',
    };

    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
      },
      secondary: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: theme.colors.primary,
      },
      text: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
      },
      danger: {
        backgroundColor: theme.colors.error,
        borderColor: theme.colors.error,
      },
    };

    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      small: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.m,
      },
      medium: {
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.l,
      },
      large: {
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.xl,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...style,
    };
  };

  const getTextStyle = () => {
    const baseStyle: TextStyle = {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    };

    const variantTextStyles: Record<ButtonVariant, TextStyle> = {
      primary: {
        color: theme.colors.white,
      },
      secondary: {
        color: theme.colors.white,
      },
      outline: {
        color: theme.colors.primary,
      },
      text: {
        color: theme.colors.primary,
      },
      danger: {
        color: theme.colors.white,
      },
    };

    const sizeTextStyles: Record<ButtonSize, TextStyle> = {
      small: {
        fontSize: 14,
      },
      medium: {
        fontSize: 16,
      },
      large: {
        fontSize: 18,
      },
    };

    return {
      ...baseStyle,
      ...variantTextStyles[variant],
      ...sizeTextStyles[size],
      ...textStyle,
    };
  };

  const renderIcon = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={getTextStyle().color}
          size={iconSize}
          style={[
            styles.icon,
            iconPosition === 'left' ? styles.leftIcon : styles.rightIcon,
          ]}
        />
      );
    }

    if (hasIcon) {
      return (
        <Ionicons
          name={iconName}
          size={iconSize}
          color={iconColor || getTextStyle().color}
          style={[
            styles.icon,
            iconPosition === 'left' ? styles.leftIcon : styles.rightIcon,
          ]}
        />
      );
    }

    return null;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {showLeftIcon && renderIcon()}
      
      {title ? (
        <Text style={getTextStyle()}>
          {title}
        </Text>
      ) : null}
      
      {children}
      
      {showRightIcon && renderIcon()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  icon: {
    marginHorizontal: 4,
  },
  leftIcon: {
    marginRight: 8,
    marginLeft: 0,
  },
  rightIcon: {
    marginLeft: 8,
    marginRight: 0,
  },
});

export default Button;
