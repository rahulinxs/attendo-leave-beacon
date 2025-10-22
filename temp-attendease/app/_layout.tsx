import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { CompanyProvider } from '../contexts/CompanyContext';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomDrawer from '../src/components/CustomDrawer';
import { useColorScheme } from '@/hooks/use-color-scheme';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();

  if (isLoading) {
    return null; // or a loading spinner
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack>
          {!user ? (
            <Stack.Screen name="auth" options={{ headerShown: false }} />
          ) : (
            <Stack.Screen 
              name="(drawer)" 
              options={{ 
                headerShown: false,
              }}
            />
          )}
          {/* Add modal screens here if needed */}
        </Stack>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <RootLayoutNav />
      </CompanyProvider>
    </AuthProvider>
  );
}
