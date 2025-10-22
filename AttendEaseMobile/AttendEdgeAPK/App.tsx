import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/contexts/AuthContext';
import { DrawerNavigator } from '../src/navigation/DrawerNavigator';
import { View, StyleSheet } from 'react-native';

const AppContent = () => (
  <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
    <DrawerNavigator />
    <StatusBar style="auto" />
  </SafeAreaView>
);

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
