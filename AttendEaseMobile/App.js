import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './screens/AuthScreen';
import { RootStack } from './src/app/stack';

const Stack = createStackNavigator();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null; // Or a loading spinner
  return (
    <Stack.Navigator>
      {user ? (
        <Stack.Screen name="Root" component={RootStack} options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
