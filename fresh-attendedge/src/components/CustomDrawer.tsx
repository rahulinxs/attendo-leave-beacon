import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';

type CustomDrawerProps = DrawerContentComponentProps & {
  // Add any additional props here if needed
};

const CustomDrawer: React.FC<CustomDrawerProps> = (props) => {
  const { logout } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [activeRoute, setActiveRoute] = useState('Home');
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks
    
    try {
      setIsSigningOut(true);
      
      // Close the drawer first
      navigation.dispatch(DrawerActions.closeDrawer());
      
      // Call the logout function from auth context
      const { success, error } = await logout();
      
      if (!success) {
        console.error('Logout failed:', error);
        // Even if logout fails, we should still navigate to auth screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
      // The RootNavigator will handle the actual navigation when user becomes null
      
    } catch (error) {
      console.error('Error during sign out:', error);
      // Ensure we still navigate to auth screen even if there's an error
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.drawerHeader}>
          <Text style={styles.headerText}>Menu</Text>
        </View>
        
        <DrawerItemList {...props} />
        
        <View style={styles.divider} />
      </DrawerContentScrollView>
      <View style={styles.footer}>
        <TouchableOpacity 
          onPress={handleSignOut} 
          style={[styles.logoutButton, isSigningOut && styles.disabledButton]}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  drawerHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  disabledButton: {
    opacity: 0.7,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#fff',
  },
});

export default CustomDrawer;
