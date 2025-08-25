import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

const TeamsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teams</Text>
      <Text style={styles.subtitle}>View and manage your teams</Text>
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

export default TeamsScreen;
