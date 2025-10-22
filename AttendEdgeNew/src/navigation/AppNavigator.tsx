import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, NavigationProp } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Import screens
import LoginScreen from '@screens/auth/LoginScreen';
import HomeScreen from '@screens/HomeScreen';
import SplashScreen from '@screens/SplashScreen';
import { apiService } from '@lib/api';

// Define navigation types
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: undefined;
  ResetPassword: { token: string };
  ForgotPassword: undefined;
  // Add other screens here
};

export type AppNavigationProp = NavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        
        if (token) {
          // Validate token with backend
          try {
            await apiService.getProfile();
            setUserToken(token);
          } catch (error) {
            // Token is invalid, clear it
            console.log('Invalid token, logging out...');
            await SecureStore.deleteItemAsync('auth_token');
            setUserToken(null);
          }
        } else {
          setUserToken(null);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUserToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle authentication state changes
  const handleLogin = (token: string) => {
    setUserToken(token);
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      setUserToken(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Show loading indicator while checking auth status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {userToken ? (
          // Authenticated screens
          <Stack.Group>
            <Stack.Screen name="Home">
              {(props) => <HomeScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            {/* Add other authenticated screens here */}
          </Stack.Group>
        ) : (
          // Auth screens
          <Stack.Group>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
            {/* Add other auth screens here */}
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default AppNavigator;
