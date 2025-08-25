import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';

// Import components
import StatCard from '../components/StatCard';
import QuickAction from '../components/QuickAction';

const DashboardScreen = () => {
  const navigation = useNavigation();

  // Sample data - replace with actual data from your API
  const stats = [
    { title: 'Total Employees', value: '124', icon: 'people', color: theme.colors.primary },
    { title: 'Present Today', value: '89', icon: 'checkmark-circle', color: theme.colors.success },
    { title: 'On Leave', value: '12', icon: 'calendar', color: theme.colors.warning },
    { title: 'Absent', value: '23', icon: 'close-circle', color: theme.colors.error },
  ];

  const quickActions = [
    { 
      title: 'Mark Attendance', 
      icon: 'finger-print',
      screen: 'Attendance',
      color: theme.colors.primary
    },
    { 
      title: 'Apply Leave', 
      icon: 'calendar',
      screen: 'Leave',
      color: theme.colors.secondary
    },
    { 
      title: 'Team', 
      icon: 'people',
      screen: 'Teams',
      color: theme.colors.success
    },
    { 
      title: 'Reports', 
      icon: 'bar-chart',
      screen: 'Reports',
      color: theme.colors.warning
    },
  ];

  const recentActivities = [
    { id: '1', title: 'John Doe marked attendance', time: '2 min ago' },
    { id: '2', title: 'New leave request from Jane Smith', time: '1 hour ago' },
    { id: '3', title: 'Monthly report generated', time: '3 hours ago' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>Admin</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image
              source={require('../../../../assets/avatar-placeholder.png')}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            {quickActions.map((action, index) => (
              <QuickAction
                key={index}
                title={action.title}
                icon={action.icon}
                color={action.color}
                onPress={() => navigation.navigate(action.screen as never)}
              />
            ))}
          </View>
        </View>

        {/* Recent Activities */}
        <View style={[styles.section, { marginBottom: theme.spacing.xxl }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.activitiesContainer}>
            {recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  seeAllText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activitiesContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

export default DashboardScreen;
