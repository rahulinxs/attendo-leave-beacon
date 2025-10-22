import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AppHeader from './AppHeader';

// List of module names that should show the header
const MODULES_WITH_HEADER = [
  'Leave',
  'Profile',
  'Reports',
  'Team Management',
  'Dashboard'
];

type WithHeaderProps = {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  rightComponent?: React.ReactNode;
  route?: any;
  navigation?: any;
};

const withHeader = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  title: string = '',
  showBack: boolean = false,
  showMenu: boolean = true
) => {
  const WithHeader: React.FC<P & WithHeaderProps> = (props) => {
    const navigation = useNavigation();
    const route = useRoute();
    const { 
      rightComponent,
      ...restProps
    } = props as WithHeaderProps;

    // Get the screen title from the route if not provided
    let screenTitle = title || route?.name || '';
    
    // Clean up the title by removing 'AttendEdge' and any app name prefixes, then trim spaces
    screenTitle = screenTitle
      .replace(/^AttendEdge\s*/i, '')  // Remove 'AttendEdge' at the start of the string
      .replace(/\s*AttendEdge\s*/i, ' ')  // Remove 'AttendEdge' in the middle of the string
      .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
      .trim();
    
    // Check if the current screen should show the header
    const shouldShowHeader = MODULES_WITH_HEADER.some(module => 
      screenTitle.toLowerCase().includes(module.toLowerCase())
    );
    
    // Check if this is one of the modules that needs adjusted spacing
    const needsAdjustedSpacing = [
      'Leave',
      'Profile',
      'Reports',
      'Team Management'
    ].some(module => screenTitle.toLowerCase().includes(module.toLowerCase()));

    return (
      <View style={[
        styles.container,
        needsAdjustedSpacing && styles.adjustedContainer
      ]}>
        {shouldShowHeader && (
          <View style={needsAdjustedSpacing && styles.adjustedHeader}>
            <AppHeader 
              title={screenTitle}
              showBack={showBack}
              showMenu={showMenu}
              onBackPress={showBack ? navigation.goBack : undefined}
              rightComponent={rightComponent}
            />
          </View>
        )}
        <View style={[
          styles.content, 
          !shouldShowHeader && styles.fullScreenContent,
          needsAdjustedSpacing && styles.adjustedContent
        ]}>
          <WrappedComponent 
            {...restProps as P} 
            route={route}
            navigation={navigation}
          />
        </View>
      </View>
    );
  };

  return WithHeader;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  adjustedContainer: {
    // Add any container adjustments here if needed
  },
  adjustedHeader: {
    // Adjust header spacing if needed
    paddingTop: 10,
  },
  content: {
    flex: 1,
  },
  adjustedContent: {
    // Match the spacing of other modules
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  fullScreenContent: {
    flex: 1,
    paddingTop: 0,
  },
});

export default withHeader;
