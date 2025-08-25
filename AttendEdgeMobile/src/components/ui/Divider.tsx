import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../../theme';

type DividerOrientation = 'horizontal' | 'vertical';
type DividerVariant = 'solid' | 'dashed' | 'dotted';

interface DividerProps {
  style?: ViewStyle;
  color?: string;
  thickness?: number;
  orientation?: DividerOrientation;
  variant?: DividerVariant;
  marginVertical?: number;
  marginHorizontal?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  testID?: string;
}

const Divider: React.FC<DividerProps> = ({
  style,
  color = theme.colors.border,
  thickness = StyleSheet.hairlineWidth,
  orientation = 'horizontal',
  variant = 'solid',
  marginVertical,
  marginHorizontal,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  testID,
}) => {
  const isHorizontal = orientation === 'horizontal';

  const getBorderStyle = () => {
    switch (variant) {
      case 'dashed':
        return {
          borderStyle: 'dashed',
          borderWidth: isHorizontal ? [0, 0, thickness, 0] : [0, 0, 0, thickness],
          borderColor: color,
        };
      case 'dotted':
        return {
          borderStyle: 'dotted',
          borderWidth: isHorizontal ? [0, 0, thickness, 0] : [0, 0, 0, thickness],
          borderColor: color,
        };
      case 'solid':
      default:
        return {
          backgroundColor: color,
          height: isHorizontal ? thickness : '100%',
          width: isHorizontal ? '100%' : thickness,
        };
    }
  };

  const dividerStyle: ViewStyle = {
    ...getBorderStyle(),
    marginVertical,
    marginHorizontal,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    ...(isHorizontal ? { width: '100%' } : { height: '100%' }),
    ...style,
  };

  return <View testID={testID} style={dividerStyle} />;
};

export default Divider;
