import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../../../theme';
import Text from './Text';

interface LoadingProps {
  size?: 'small' | 'large' | number;
  color?: string;
  text?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  color,
  text,
  style,
  textStyle,
  fullScreen = false,
}) => {
  const spinnerColor = color || theme.colors.primary;

  const containerStyle: ViewStyle = {
    ...styles.container,
    ...(fullScreen ? styles.fullScreen : {}),
    ...style,
  };

  return (
    <View style={containerStyle}>
      <ActivityIndicator 
        size={size} 
        color={spinnerColor} 
        style={styles.spinner}
      />
      {text && (
        <Text style={[styles.text, textStyle]}>
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = {
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.m,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  spinner: {
    marginBottom: theme.spacing.m,
  },
  text: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
} as const;

export default Loading;
