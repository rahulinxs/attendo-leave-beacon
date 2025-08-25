import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

const LeaveScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leave Management</Text>
      <Text style={styles.subtitle}>Request and track time off</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});

export default LeaveScreen;
