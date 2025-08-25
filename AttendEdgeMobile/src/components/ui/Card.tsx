import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { theme } from '../../../theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 's' | 'm' | 'l' | 'xl';
  borderRadius?: 's' | 'm' | 'l' | 'xl' | 'xxl' | 'round';
  backgroundColor?: string;
  borderColor?: string;
  shadow?: boolean;
  fullWidth?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'elevated',
  padding = 'm',
  borderRadius = 'm',
  backgroundColor,
  borderColor,
  shadow = true,
  fullWidth = false,
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: backgroundColor || theme.colors.backgroundLight,
          borderWidth: 0,
        };
      case 'outlined':
        return {
          backgroundColor: backgroundColor || 'transparent',
          borderWidth: 1,
          borderColor: borderColor || theme.colors.border,
        };
      case 'filled':
        return {
          backgroundColor: backgroundColor || theme.colors.primaryLight,
          borderWidth: 0,
        };
      default:
        return {};
    }
  };

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 's':
        return theme.spacing.s;
      case 'm':
        return theme.spacing.m;
      case 'l':
        return theme.spacing.l;
      case 'xl':
        return theme.spacing.xl;
      default:
        return theme.spacing.m;
    }
  };

  const getBorderRadius = () => {
    switch (borderRadius) {
      case 's':
        return theme.borderRadius.s;
      case 'm':
        return theme.borderRadius.m;
      case 'l':
        return theme.borderRadius.l;
      case 'xl':
        return theme.borderRadius.xl;
      case 'xxl':
        return theme.borderRadius.xxl;
      case 'round':
        return 9999;
      default:
        return theme.borderRadius.m;
    }
  };

  const cardStyle: ViewStyle = {
    ...getVariantStyle(),
    padding: getPadding(),
    borderRadius: getBorderRadius(),
    width: fullWidth ? '100%' : undefined,
    ...(shadow && variant === 'elevated' ? theme.shadows.sm : {}),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.container, cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, cardStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default Card;
