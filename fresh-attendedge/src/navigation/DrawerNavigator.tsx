import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { HomeScreen } from '../screens/HomeScreen';
import { useAuth } from '../contexts/AuthContext';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = ({ navigation }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.drawerHeader}>
        <Text style={styles.headerText}>Menu</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.drawerItem}
        onPress={() => navigation.navigate('Home')}
      >
        <Ionicons name="home" size={20} style={styles.icon} />
        <Text>Home</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity 
        style={styles.drawerItem}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} style={styles.icon} />
        <Text>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export const AppDrawer = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        drawerStyle: {
          width: '80%',
          backgroundColor: '#ffffff',
        },
        sceneContainerStyle: {
          backgroundColor: '#ffffff',
        },
        swipeEnabled: true,
        gestureEnabled: true,
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  drawerHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 5,
    marginVertical: 5,
  },
  icon: {
    marginRight: 15,
    width: 25,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
});
