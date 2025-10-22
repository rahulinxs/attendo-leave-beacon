import React, { ReactNode, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

type RootStackParamList = {
  [key: string]: undefined;
};

type NavigationProps = NavigationProp<RootStackParamList> & {
  dispatch: (action: any) => void;
  toggleDrawer: () => void;
  goBack: () => void;
};

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  onBackPress?: () => void;
  rightComponent?: ReactNode;
}

const AppHeader = ({ title, showBack = false, showMenu = true, onBackPress, rightComponent }: AppHeaderProps) => {
  const navigation = useNavigation<NavigationProps>();
  const { logout } = useAuth();
  
  // Ensure we can access the drawer actions
  const toggleDrawer = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leftContainer}>
          {showBack ? (
            <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
          ) : showMenu ? (
            <TouchableOpacity 
              onPress={toggleDrawer}
              style={styles.iconButton}
            >
              <Ionicons name="menu" size={28} color="#1e293b" />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconButton} />
          )}
          
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
        
        {rightComponent && (
          <View style={styles.rightComponent}>
            {rightComponent}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingTop: 0,
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight || 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    height: (StatusBar.currentHeight || 24) + 56, // Account for status bar height
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  rightComponent: {
    marginLeft: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  logoutButton: {
    padding: 8,
    marginLeft: 8,
  },
  iconButton: {
    padding: 8,
    margin: -8,
  },
});

export default AppHeader;
