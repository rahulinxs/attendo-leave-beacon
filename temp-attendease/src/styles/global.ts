import { StyleSheet } from 'react-native';

export const globalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingTop: 16, // Add top padding to all screens
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export const screenOptions = {
  headerShown: false,
  contentStyle: {
    backgroundColor: '#fff',
  },
};
