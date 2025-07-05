import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAttendance } from '../lib/useAttendance';
import { useUserProfile } from '../lib/useUserProfile';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  total_hours: number;
}

export default function AttendanceManagementScreen({ navigation }: any) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { userProfile } = useUserProfile();
  const { getAttendanceRecords, updateAttendance } = useAttendance();

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      // This would need to be implemented in the useAttendance hook
      // For now, we'll use placeholder data
      const mockData: AttendanceRecord[] = [
        {
          id: '1',
          employee_id: 'EMP001',
          employee_name: 'John Doe',
          date: selectedDate,
          check_in: '09:00',
          check_out: '17:00',
          status: 'present',
          total_hours: 8,
        },
        {
          id: '2',
          employee_id: 'EMP002',
          employee_name: 'Jane Smith',
          date: selectedDate,
          check_in: '08:30',
          check_out: '17:30',
          status: 'present',
          total_hours: 9,
        },
      ];
      setAttendanceRecords(mockData);
    } catch (error) {
      console.error('Error loading attendance records:', error);
      Alert.alert('Error', 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendanceRecords();
    setRefreshing(false);
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const handleUpdateAttendance = (recordId: string, updates: any) => {
    Alert.alert(
      'Update Attendance',
      'Are you sure you want to update this attendance record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              await updateAttendance(recordId, updates);
              Alert.alert('Success', 'Attendance updated successfully');
              loadAttendanceRecords();
            } catch (error) {
              console.error('Error updating attendance:', error);
              Alert.alert('Error', 'Failed to update attendance');
            }
          },
        },
      ]
    );
  };

  const handleExportAttendance = () => {
    Alert.alert('Export Attendance', 'Export functionality coming soon');
  };

  useEffect(() => {
    loadAttendanceRecords();
  }, [selectedDate]);

  const canManageAttendance = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.role === 'reporting_manager';

  if (!canManageAttendance) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>You don't have permission to manage attendance.</Text>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Management</Text>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportAttendance}>
          <Ionicons name="download" size={20} color="#3b82f6" />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => handleDateChange('prev')}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        <TouchableOpacity onPress={() => handleDateChange('next')}>
          <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading attendance records...</Text>
          </View>
        ) : attendanceRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No attendance records found</Text>
          </View>
        ) : (
          attendanceRecords.map((record) => (
            <View key={record.id} style={styles.attendanceCard}>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{record.employee_name}</Text>
                <Text style={styles.employeeId}>ID: {record.employee_id}</Text>
              </View>
              
              <View style={styles.attendanceDetails}>
                <View style={styles.timeRow}>
                  <View style={styles.timeItem}>
                    <Text style={styles.timeLabel}>Check In</Text>
                    <Text style={styles.timeValue}>{record.check_in}</Text>
                  </View>
                  <View style={styles.timeItem}>
                    <Text style={styles.timeLabel}>Check Out</Text>
                    <Text style={styles.timeValue}>{record.check_out}</Text>
                  </View>
                  <View style={styles.timeItem}>
                    <Text style={styles.timeLabel}>Total Hours</Text>
                    <Text style={styles.timeValue}>{record.total_hours}h</Text>
                  </View>
                </View>
                
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          record.status === 'present' ? '#10b981' : 
                          record.status === 'absent' ? '#ef4444' : '#f59e0b',
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleUpdateAttendance(record.id, {})}
                >
                  <Ionicons name="pencil" size={16} color="#3b82f6" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  attendanceCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  employeeInfo: {
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 14,
    color: '#64748b',
  },
  attendanceDetails: {
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeItem: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editButton: {
    backgroundColor: '#eff6ff',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    padding: 20,
  },
}); 