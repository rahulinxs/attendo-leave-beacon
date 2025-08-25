import React, { ReactNode } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import Text, { TextProps } from './Text';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps extends Omit<TextProps, 'variant' | 'weight'> {
  level?: HeadingLevel;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}

const Heading: React.FC<HeadingProps> = ({
  level = 1,
  children,
  style,
  ...rest
}) => {
  const getVariant = (): string => {
    return `h${level}` as const;
  };

  const getWeight = (): 'bold' | 'semiBold' => {
    return level <= 3 ? 'bold' : 'semiBold';
  };

  return (
    <Text
      variant={getVariant()}
      weight={getWeight()}
      style={[styles.heading, style]}
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = {
  heading: {
    marginBottom: 8,
  },
} as const;

export default Heading;
