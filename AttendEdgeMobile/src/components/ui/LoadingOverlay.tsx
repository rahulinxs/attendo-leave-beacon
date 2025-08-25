import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  Text,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '../../../theme';
import { BlurView } from '@react-native-community/blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  size?: 'small' | 'large' | number;
  color?: string;
  backgroundColor?: string;
  overlayStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<ViewStyle>;
  useBlur?: boolean;
  blurType?: 'light' | 'dark' | 'xlight' | 'dark' | 'default' | 'extraDark' | 'regular' | 'prominent' | 'transparent';
  blurAmount?: number;
  testID?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible = false,
  message,
  size = 'large',
  color,
  backgroundColor = 'rgba(0, 0, 0, 0.6)',
  overlayStyle,
  contentContainerStyle,
  textStyle,
  useBlur = false,
  blurType = 'dark',
  blurAmount = 5,
  testID,
}) => {
  const { colors } = useTheme();
  const spinnerColor = color || colors.primary;

  if (!visible) return null;

  const renderContent = () => (
    <View
      style={[
        styles.contentContainer,
        { backgroundColor: useBlur ? 'transparent' : backgroundColor },
        contentContainerStyle,
      ]}
    >
      <ActivityIndicator
        size={size}
        color={spinnerColor}
        style={styles.spinner}
      />
      {message && (
        <Text style={[styles.message, { color: colors.textInverse }, textStyle]}>
          {message}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.overlay, overlayStyle]} testID={testID}>
      {useBlur && Platform.OS === 'ios' ? (
        <BlurView
          style={styles.blurView}
          blurType={blurType as any}
          blurAmount={blurAmount}
          reducedTransparencyFallbackColor={backgroundColor}
        >
          {renderContent()}
        </BlurView>
      ) : (
        <View style={[styles.nonBlurredView, { backgroundColor }]}>
          {renderContent()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  blurView: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nonBlurredView: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 120,
  },
  spinner: {
    marginBottom: 10,
  },
  message: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default LoadingOverlay;
