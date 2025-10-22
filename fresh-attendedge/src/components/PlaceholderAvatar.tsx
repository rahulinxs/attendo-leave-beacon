import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface PlaceholderAvatarProps {
  size?: number;
  name?: string;
  backgroundColor?: string;
  textColor?: string;
}

const PlaceholderAvatar: React.FC<PlaceholderAvatarProps> = ({
  size = 50,
  name = 'U',
  backgroundColor = '#CCCCCC',
  textColor = '#FFFFFF',
}) => {
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const initials = name ? getInitials(name) : 'U';

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: size * 0.4,
            color: textColor,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default PlaceholderAvatar;
