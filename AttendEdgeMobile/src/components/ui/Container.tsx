import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, ScrollView, SafeAreaView, StatusBar, StatusBarStyle } from 'react-native';
import { theme } from '../../../theme';

type ContainerProps = {
  children: ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  safeArea?: boolean;
  statusBarStyle?: StatusBarStyle;
  statusBarColor?: string;
  backgroundColor?: string;
  padding?: 'none' | 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';
  paddingHorizontal?: 'none' | 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';
  paddingVertical?: 'none' | 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';
  fullScreen?: boolean;
};

const Container: React.FC<ContainerProps> = ({
  children,
  style,
  scrollable = false,
  safeArea = true,
  statusBarStyle = 'dark-content',
  statusBarColor = theme.colors.background,
  backgroundColor = theme.colors.background,
  padding = 'm',
  paddingHorizontal,
  paddingVertical,
  fullScreen = false,
}) => {
  const getPadding = (size: string) => {
    switch (size) {
      case 'none':
        return 0;
      case 'xs':
        return theme.spacing.xs;
      case 's':
        return theme.spacing.s;
      case 'm':
        return theme.spacing.m;
      case 'l':
        return theme.spacing.l;
      case 'xl':
        return theme.spacing.xl;
      case 'xxl':
        return theme.spacing.xxl;
      default:
        return theme.spacing.m;
    }
  };

  const containerStyle: ViewStyle = {
    flex: fullScreen ? 1 : undefined,
    backgroundColor,
    padding: getPadding(padding),
    ...(paddingHorizontal !== undefined && { paddingHorizontal: getPadding(paddingHorizontal) }),
    ...(paddingVertical !== undefined && { paddingVertical: getPadding(paddingVertical) }),
    ...style,
  };

  const renderContent = () => {
    if (scrollable) {
      return (
        <ScrollView
          style={[styles.scrollView, { backgroundColor }]}
          contentContainerStyle={[containerStyle, styles.scrollContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      );
    }

    return <View style={containerStyle}>{children}</View>;
  };

  const content = (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarColor}
        translucent={false}
      />
      {renderContent()}
    </>
  );

  if (safeArea) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        {content}
      </SafeAreaView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default Container;
