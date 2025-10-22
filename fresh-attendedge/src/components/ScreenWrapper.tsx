import React from 'react';
import { View, StyleSheet, ViewStyle, ScrollView, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  statusBarStyle?: 'light-content' | 'dark-content' | 'default';
  statusBarColor?: string;
  backgroundColor?: string;
  paddingHorizontal?: number;
  paddingTop?: number;
  paddingBottom?: number;
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  style,
  scrollable = true,
  statusBarStyle = 'dark-content',
  statusBarColor = '#FFFFFF',
  backgroundColor = '#FFFFFF',
  paddingHorizontal = 16,
  paddingTop = 0,
  paddingBottom = 0,
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : insets.top,
    paddingBottom: insets.bottom,
    paddingHorizontal,
  };

  const contentContainer = {
    flexGrow: 1,
    paddingTop,
    paddingBottom,
  };

  const renderContent = () => (
    <View style={[styles.container, containerStyle, style]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarColor}
        translucent={true}
      />
      <View style={contentContainer}>
        {children}
      </View>
    </View>
  );

  if (scrollable) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor }}>{renderContent()}</SafeAreaView>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export { ScreenWrapper };
