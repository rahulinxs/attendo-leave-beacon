import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceholderAvatar from './PlaceholderAvatar';

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  showMenu?: boolean;
  rightIcon?: string;
  onRightIconPress?: () => void;
  showLogo?: boolean;
  backgroundColor?: string;
  textColor?: string;
  iconColor?: string;
  onMenuPress?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title = 'AttendEdge',
  showBackButton = false,
  showMenu = false,
  rightIcon,
  onRightIconPress,
  onMenuPress,
  showLogo = false,
  backgroundColor = '#FFFFFF',
  textColor = '#22223b',
  iconColor = '#22223b',
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor }]}>
      <View style={styles.content}>
        {showBackButton ? (
          <TouchableOpacity onPress={handleBackPress} style={styles.iconContainer}>
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : showMenu ? (
          <TouchableOpacity onPress={onMenuPress} style={styles.iconContainer}>
            <Ionicons name="menu" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconContainer} />
        )}

        {showLogo ? (
          <View style={styles.logoContainer}>
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          </View>
        ) : (
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        )}

        {rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.iconContainer}>
            <Ionicons name={rightIcon as any} size={24} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconContainer} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppHeader;
