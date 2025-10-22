import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Card, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const quickActions = [
    {
      title: 'Check In/Out',
      icon: 'time-outline',
      onPress: () => router.push('/(drawer)/attendance'),
    },
    {
      title: 'Apply Leave',
      icon: 'calendar-outline',
      onPress: () => router.push('/(drawer)/leave'),
    },
    {
      title: 'My Team',
      icon: 'people-outline',
      onPress: () => router.push('/(drawer)/team-management'),
    },
    {
      title: 'Reports',
      icon: 'document-text-outline',
      onPress: () => router.push('/(drawer)/reports'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.user_metadata?.name || 'User'}</Text>
      </View>

      <View style={styles.quickActions}>
        {quickActions.map((action, index) => (
          <Card 
            key={index} 
            style={styles.actionCard}
            onPress={action.onPress}
          >
            <Card.Content style={styles.actionContent}>
              <Ionicons name={action.icon} size={24} color="#4f46e5" />
              <Text style={styles.actionText}>{action.title}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <Text style={styles.noActivity}>No recent activity</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 18,
    color: '#6b7280',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  actionContent: {
    alignItems: 'center',
    padding: 16,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  noActivity: {
    textAlign: 'center',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});
