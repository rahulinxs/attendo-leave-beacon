import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../../theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../../../theme';

interface ThemeToggleProps {
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
  thumbStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ViewStyle>;
  onToggle?: (isDark: boolean) => void;
  testID?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 50,
  iconSize = 20,
  style,
  trackStyle,
  thumbStyle,
  iconStyle,
  onToggle,
  testID,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const handlePress = () => {
    toggleTheme();
    if (onToggle) {
      onToggle(!isDark);
    }
  };

  const trackDynamicStyle = {
    backgroundColor: isDark 
      ? 'rgba(255, 255, 255, 0.1)' 
      : 'rgba(0, 0, 0, 0.1)',
    width: size * 1.8,
    height: size * 0.5,
    borderRadius: size * 0.25,
  };

  const thumbDynamicStyle = {
    backgroundColor: isDark 
      ? theme.colors.primaryLight 
      : theme.colors.primary,
    width: size * 0.8,
    height: size * 0.8,
    borderRadius: size * 0.4,
    transform: [
      { 
        translateX: isDark 
          ? size * 0.5 
          : -size * 0.5 
      },
    ],
  };

  const iconDynamicStyle = {
    color: isDark 
      ? theme.colors.primaryLight 
      : theme.colors.primary,
    fontSize: iconSize,
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.container, style]}
      testID={testID}
    >
      <View style={[styles.track, trackDynamicStyle, trackStyle]}>
        <View style={[styles.thumb, thumbDynamicStyle, thumbStyle]}>
          <Icon
            name={isDark ? 'moon' : 'sunny'}
            style={[styles.icon, iconDynamicStyle, iconStyle]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  icon: {
    textAlign: 'center',
  },
});

export default ThemeToggle;
