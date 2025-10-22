import React, { useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme, ActivityIndicator, DataTable } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Types
import { RootStackParamList } from '@navigation/AppNavigator';
import { AttendanceRecord } from '@types/attendance';

// Utils
import { showToast } from '@utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'Attendance'>;

const AttendanceScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [currentDate] = useState(new Date());

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to fetch attendance records
      // const data = await apiService.getAttendanceRecords();
      // setAttendanceRecords(data);
      
      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockData: AttendanceRecord[] = [
        {
          id: '1',
          date: new Date('2023-10-14T09:00:00'),
          checkIn: new Date('2023-10-14T09:00:00'),
          checkOut: new Date('2023-10-14T17:30:00'),
          status: 'present',
          totalHours: 8.5,
        },
        {
          id: '2',
          date: new Date('2023-10-13T09:00:00'),
          checkIn: new Date('2023-10-13T09:15:00'),
          checkOut: new Date('2023-10-13T17:45:00'),
          status: 'present',
          totalHours: 8.5,
        },
      ];
      setAttendanceRecords(mockData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      showToast('error', 'Failed to load attendance records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAttendance();
    }, [fetchAttendance])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAttendance();
  }, [fetchAttendance]);

  const handleCheckIn = async () => {
    try {
      // TODO: Implement check-in API call
      // await apiService.checkIn();
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast('success', 'Checked in successfully');
      fetchAttendance();
    } catch (error) {
      console.error('Check-in error:', error);
      showToast('error', 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      // TODO: Implement check-out API call
      // await apiService.checkOut();
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast('success', 'Checked out successfully');
      fetchAttendance();
    } catch (error) {
      console.error('Check-out error:', error);
      showToast('error', 'Failed to check out');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerText}>
            Today's Attendance
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {formatDate(currentDate)}
          </Text>
        </View>

        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <View style={styles.attendanceActions}>
              <Button
                mode="contained"
                onPress={handleCheckIn}
                style={[styles.actionButton, { marginRight: 8 }]}
                icon="login"
              >
                Check In
              </Button>
              <Button
                mode="outlined"
                onPress={handleCheckOut}
                style={styles.actionButton}
                icon="logout"
              >
                Check Out
              </Button>
            </View>

            <View style={styles.statusContainer}>
              <View style={styles.statusItem}>
                <MaterialCommunityIcons
                  name="calendar-check"
                  size={24}
                  color={colors.primary}
                />
                <Text variant="bodyLarge" style={styles.statusText}>
                  Present: 5 days
                </Text>
              </View>
              <View style={styles.statusItem}>
                <MaterialCommunityIcons
                  name="calendar-remove"
                  size={24}
                  color={colors.error}
                />
                <Text variant="bodyLarge" style={styles.statusText}>
                  Absent: 0 days
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.historyHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Attendance History
          </Text>
        </View>

        {attendanceRecords.length > 0 ? (
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Date</DataTable.Title>
                <DataTable.Title>Check In</DataTable.Title>
                <DataTable.Title>Check Out</DataTable.Title>
                <DataTable.Title>Total</DataTable.Title>
              </DataTable.Header>

              {attendanceRecords.map((record) => (
                <DataTable.Row key={record.id}>
                  <DataTable.Cell>
                    {record.date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {record.checkIn ? formatTime(record.checkIn) : '--:--'}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {record.checkOut ? formatTime(record.checkOut) : '--:--'}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {record.totalHours ? `${record.totalHours}h` : '--'}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="calendar-blank"
              size={48}
              color={colors.onSurfaceDisabled}
            />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>
              No attendance records found
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  headerText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  attendanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  statusContainer: {
    marginTop: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    marginLeft: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});

export default AttendanceScreen;
