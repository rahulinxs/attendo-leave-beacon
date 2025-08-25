import React from 'react';
import { StyleSheet, View, ViewStyle, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons/MaterialIcons';
import { MaterialCommunityIcons } from '@expo/vector-icons/MaterialCommunityIcons';
import { Ionicons } from '@expo/vector-icons/Ionicons';
import { Feather } from '@expo/vector-icons/Feather';
import { FontAwesome } from '@expo/vector-icons/FontAwesome';
import { FontAwesome5 } from '@expo/vector-icons/FontAwesome5';
import { useTheme } from '../../theme';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;
type MaterialCommunityIconName = keyof typeof MaterialCommunityIcons.glyphMap;
type IoniconName = keyof typeof Ionicons.glyphMap;
type FeatherName = keyof typeof Feather.glyphMap;
type FontAwesomeName = keyof typeof FontAwesome.glyphMap;
type FontAwesome5Name = keyof typeof FontAwesome5.glyphMap;

type IconType = 'material' | 'material-community' | 'ionicon' | 'feather' | 'font-awesome' | 'font-awesome5';

interface IconProps {
  name: MaterialIconName | MaterialCommunityIconName | IoniconName | FeatherName | FontAwesomeName | FontAwesome5Name;
  type?: IconType;
  size?: number;
  color?: string;
  style?: ViewStyle;
  onPress?: () => void;
  testID?: string;
}

const Icon: React.FC<IconProps> = ({
  name,
  type = 'material',
  size = 24,
  color,
  style,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();
  const iconColor = color || colors.text;
  const iconSize = size;

  const renderIcon = () => {
    const iconProps = {
      name: name as any, // Type assertion needed due to complex union type
      size: iconSize,
      color: iconColor,
      style: [styles.icon, style],
      testID: testID ? `${testID}-icon` : undefined,
    };

    switch (type) {
      case 'material-community':
        return <MaterialCommunityIcons {...iconProps} />;
      case 'ionicon':
        return <Ionicons {...iconProps} />;
      case 'feather':
        return <Feather {...iconProps} />;
      case 'font-awesome':
        return <FontAwesome {...iconProps} />;
      case 'font-awesome5':
        return <FontAwesome5 {...iconProps} />;
      case 'material':
      default:
        return <MaterialIcons {...iconProps} />;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        style={[styles.container, style]}
        activeOpacity={0.7}
        testID={testID}
      >
        {renderIcon()}
      </TouchableOpacity>
    );
  }

  return renderIcon();
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    textAlign: 'center',
  },
});

export { Icon };
export type { IconType, MaterialIconName, MaterialCommunityIconName, IoniconName, FeatherName, FontAwesomeName, FontAwesome5Name };
