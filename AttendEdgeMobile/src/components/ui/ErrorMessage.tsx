import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import Text from './Text';
import Button from './Button';

interface ErrorMessageProps {
  error: string | Error | null | undefined;
  onRetry?: () => void;
  retryText?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconSize?: number;
  showIcon?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onRetry,
  retryText = 'Try Again',
  style,
  textStyle,
  iconSize = 24,
  showIcon = true,
  fullWidth = false,
  children,
}) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error?.message || 'An error occurred';

  return (
    <View style={[styles.container, fullWidth && styles.fullWidth, style]}>
      {showIcon && (
        <Ionicons
          name="alert-circle-outline"
          size={iconSize}
          color={theme.colors.error}
          style={styles.icon}
        />
      )}
      
      <Text style={[styles.text, textStyle]}>{errorMessage}</Text>
      
      {onRetry && (
        <Button
          variant="outline"
          size="small"
          onPress={onRetry}
          style={styles.retryButton}
          title={retryText}
        />
      )}
      
      {children}
    </View>
  );
};

const styles = {
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.errorLight,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.errorLight,
  },
  fullWidth: {
    width: '100%',
  },
  icon: {
    marginBottom: theme.spacing.s,
  },
  text: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.s,
  },
  retryButton: {
    marginTop: theme.spacing.s,
  },
} as const;

export default ErrorMessage;
