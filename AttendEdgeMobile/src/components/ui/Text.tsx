import React, { ReactNode } from 'react';
import { Text as RNText, StyleSheet, TextStyle, TextProps as RNTextProps } from 'react-native';
import { theme } from '../../theme';

type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'button'
  | 'caption'
  | 'overline';

type TextWeight = 'regular' | 'medium' | 'semiBold' | 'bold';
type TextAlign = 'auto' | 'left' | 'right' | 'center' | 'justify';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: string;
  align?: TextAlign;
  children: ReactNode;
  style?: TextStyle;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  selectable?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

const Text: React.FC<TextProps> = ({
  variant = 'body1',
  weight = 'regular',
  color = theme.colors.text,
  align = 'auto',
  children,
  style,
  numberOfLines,
  ellipsizeMode,
  selectable,
  onPress,
  onLongPress,
  ...rest
}) => {
  const getFontSize = (): number => {
    switch (variant) {
      case 'h1':
        return 32;
      case 'h2':
        return 28;
      case 'h3':
        return 24;
      case 'h4':
        return 20;
      case 'h5':
        return 18;
      case 'h6':
        return 16;
      case 'subtitle1':
        return 16;
      case 'subtitle2':
        return 14;
      case 'body1':
        return 16;
      case 'body2':
        return 14;
      case 'button':
        return 14;
      case 'caption':
        return 12;
      case 'overline':
        return 10;
      default:
        return 16;
    }
  };

  const getLineHeight = (): number => {
    return Math.round(getFontSize() * 1.5);
  };

  const getFontWeight = (): TextStyle['fontWeight'] => {
    switch (weight) {
      case 'regular':
        return '400';
      case 'medium':
        return '500';
      case 'semiBold':
        return '600';
      case 'bold':
        return '700';
      default:
        return '400';
    }
  };

  const textStyle: TextStyle = {
    fontSize: getFontSize(),
    lineHeight: getLineHeight(),
    color,
    textAlign: align,
    fontFamily: theme.fonts.primary,
    fontWeight: getFontWeight(),
    ...style,
  };

  return (
    <RNText
      style={textStyle}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      selectable={selectable}
      onPress={onPress}
      onLongPress={onLongPress}
      {...rest}
    >
      {children}
    </RNText>
  );
};

export default Text;
