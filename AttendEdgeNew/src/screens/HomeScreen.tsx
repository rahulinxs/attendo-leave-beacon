import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme, Appbar, Card, Button, Avatar } from 'react-native-paper';
import { useAuth } from '@contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.Content title="AttendEdge" />
        <Appbar.Action icon="bell-outline" onPress={() => {}} />
        <Appbar.Action icon="logout" onPress={handleLogout} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* User Profile Section */}
        <Card style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <Card.Content style={styles.profileContent}>
            <View style={styles.profileInfo}>
              <Text style={[styles.greeting, { color: colors.text }]}>
                Welcome back,
              </Text>
              <Text style={[styles.userName, { color: colors.primary }]}>
                {user?.name || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.text }]}>
                {user?.email || ''}
              </Text>
            </View>
            <Avatar.Text
              size={80}
              label={user?.name?.charAt(0) || 'U'}
              style={{ backgroundColor: colors.primary }}
              labelStyle={{ color: colors.surface, fontSize: 32 }}
            />
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              icon="clock-time-three-outline"
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              contentStyle={styles.actionButtonContent}
              onPress={() => navigation.navigate('ClockInOut' as never)}
            >
              Clock In/Out
            </Button>
            <Button
              mode="outlined"
              icon="calendar-month-outline"
              style={[styles.actionButton, { borderColor: colors.primary }]}
              contentStyle={styles.actionButtonContent}
              onPress={() => navigation.navigate('Schedule' as never)}
            >
              My Schedule
            </Button>
          </View>
        </View>

        {/* Today's Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Today's Summary
          </Text>
          <View style={styles.summaryContainer}>
            <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <Card.Content style={styles.summaryCardContent}>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>
                  08:30 AM
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>
                  Clock In
                </Text>
              </Card.Content>
            </Card>
            <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <Card.Content style={styles.summaryCardContent}>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>
                  05:45 PM
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>
                  Clock Out
                </Text>
              </Card.Content>
            </Card>
            <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <Card.Content style={styles.summaryCardContent}>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>
                  8.5
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>
                  Hours Worked
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Activity
          </Text>
          <Card style={[styles.activityCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              {[1, 2, 3].map((item) => (
                <View key={item} style={styles.activityItem}>
                  <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, { color: colors.text }]}>
                      {item === 1 ? 'Clocked In' : item === 2 ? 'Meeting' : 'Task Completed'}
                    </Text>
                    <Text style={[styles.activityTime, { color: colors.text }]}>
                      {item === 1 ? '08:30 AM' : item === 2 ? '10:00 AM' : '03:45 PM'}
                    </Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  profileCard: {
    marginBottom: 16,
    elevation: 2,
  },
  profileContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  profileInfo: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 16,
    opacity: 0.8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  actionButtonContent: {
    height: 100,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 1,
  },
  summaryCardContent: {
    alignItems: 'center',
    padding: 12,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  activityCard: {
    elevation: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
});

export default HomeScreen;
