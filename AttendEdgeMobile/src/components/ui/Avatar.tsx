import React, { memo } from 'react';
import { View, StyleSheet, Image, ImageSourcePropType, ImageStyle, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import Text from './Text';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
type AvatarVariant = 'circle' | 'rounded' | 'square';

interface AvatarProps {
  source?: ImageSourcePropType | string | null;
  size?: AvatarSize;
  variant?: AvatarVariant;
  name?: string;
  onPress?: () => void;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  showBorder?: boolean;
  borderColor?: string;
  backgroundColor?: string;
  textColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  source,
  size = 'md',
  variant = 'circle',
  name,
  onPress,
  style,
  imageStyle,
  showBorder = false,
  borderColor = theme.colors.primary,
  backgroundColor = theme.colors.primaryLight,
  textColor = theme.colors.primary,
  icon,
  iconSize,
  iconColor = theme.colors.primary,
}) => {
  const getSize = () => {
    switch (size) {
      case 'xs':
        return 24;
      case 'sm':
        return 32;
      case 'md':
        return 48;
      case 'lg':
        return 64;
      case 'xl':
        return 80;
      case 'xxl':
        return 120;
      default:
        return 48;
    }
  };

  const getFontSize = () => {
    const avatarSize = getSize();
    if (avatarSize <= 32) return 10;
    if (avatarSize <= 48) return 14;
    if (avatarSize <= 64) return 18;
    if (avatarSize <= 80) return 24;
    return 32;
  };

  const getBorderRadius = () => {
    const avatarSize = getSize();
    switch (variant) {
      case 'circle':
        return avatarSize / 2;
      case 'rounded':
        return Math.min(avatarSize * 0.2, 12);
      case 'square':
        return 0;
      default:
        return 0;
    }
  };

  const renderContent = () => {
    const avatarSize = getSize();
    const borderRadius = getBorderRadius();
    const fontSize = getFontSize();

    const containerStyle: ViewStyle = {
      width: avatarSize,
      height: avatarSize,
      borderRadius,
      backgroundColor,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: showBorder ? 2 : 0,
      borderColor: showBorder ? borderColor : 'transparent',
      ...style,
    };

    if (typeof source === 'string' || (source && 'uri' in source)) {
      return (
        <Image
          source={typeof source === 'string' ? { uri: source } : source}
          style={[
            {
              width: '100%',
              height: '100%',
              borderRadius,
            },
            imageStyle,
          ]}
          resizeMode="cover"
        />
      );
    }

    if (icon) {
      return (
        <Ionicons
          name={icon}
          size={iconSize || fontSize * 1.5}
          color={iconColor}
        />
      );
    }

    if (name) {
      const initials = name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();

      return (
        <Text
          style={{
            color: textColor,
            fontSize,
            fontWeight: 'bold',
          }}
        >
          {initials}
        </Text>
      );
    }

    return (
      <Ionicons
        name="person-outline"
        size={fontSize * 1.5}
        color={textColor}
      />
    );
  };

  const Container = onPress ? TouchableOpacity : View;
  const avatarSize = getSize();
  const borderRadius = getBorderRadius();

  return (
    <Container
      style={[
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {renderContent()}
    </Container>
  );
};

export default memo(Avatar);
