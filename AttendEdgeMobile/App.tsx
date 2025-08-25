import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { AppProviders } from './src/providers/AppProviders';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage',
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
]);

/**
 * Main App component that serves as the entry point of the application.
 * Wraps the entire app with necessary providers.
 * Expo Router handles the navigation automatically based on the file structure.
 */
export default function App() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
    </AppProviders>
  );
}
