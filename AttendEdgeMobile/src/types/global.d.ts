// Add global type declarations here
declare module '*.png' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

// Add any other global type declarations here
interface Global {
  // Add any global variables or functions here
}

declare const global: Global;
