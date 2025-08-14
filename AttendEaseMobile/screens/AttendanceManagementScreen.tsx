import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAttendance } from '../lib/useAttendance';
import { useUserProfile } from '../lib/useUserProfile';
import { supabase } from '../lib/supabase';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  check_in_time: string;
  check_out_time: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function AttendanceManagementScreen({ navigation }: any) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { profileData } = useUserProfile();
  const { checkIn, checkOut } = useAttendance();

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate);
      if (companyId) {
        query = query.eq('company_id', companyId as any);
      }
      const { data, error } = await query;
      if (error) throw error;
      setAttendanceRecords(data || []);
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

  const handleDatePickerChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
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
              setLoading(true);
              const { error } = await supabase
                .from('attendance')
                .update(updates)
                .eq('id', recordId);
              if (error) throw error;
              Alert.alert('Success', 'Attendance updated successfully');
              loadAttendanceRecords();
            } catch (error) {
              Alert.alert('Error', 'Failed to update attendance');
            } finally {
              setLoading(false);
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

  // Determine role
  const userRole = profileData?.profile?.role;
  const isAdminOrManager = userRole === 'admin' || userRole === 'super_admin' || userRole === 'reporting_manager';
  const isEmployee = userRole === 'employee';

  // For admin/manager: fetch all employees and their attendance for selectedDate
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    if (isAdminOrManager) {
      (async () => {
        let query = supabase.from('employees').select('id, name, email, position, department');
        if (companyId) {
          query = query.eq('company_id', companyId as any);
        }
        const { data, error } = await query;
        if (!error) setEmployees(data || []);
      })();
    }
  }, [isAdminOrManager]);

  // For admin/manager: fetch attendance for all employees for selectedDate
  const [allAttendance, setAllAttendance] = useState([]);
  useEffect(() => {
    if (isAdminOrManager) {
      (async () => {
        const { data, error } = await supabase.from('attendance').select('*').eq('date', selectedDate);
        if (!error) setAllAttendance(data || []);
      })();
    }
  }, [isAdminOrManager, selectedDate]);

  // Helper: get attendance record for an employee
  const getEmployeeAttendance = (empId) => allAttendance.find(a => a.employee_id === empId);

  // Helper: status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'present': return { color: '#10b981', label: 'Present' };
      case 'absent': return { color: '#ef4444', label: 'Absent' };
      case 'late': return { color: '#f59e0b', label: 'Late' };
      case 'half_day': return { color: '#64748b', label: 'Half Day' };
      default: return { color: '#e5e7eb', label: 'Not Marked' };
    }
  };

  // Mark attendance for an employee
  const markAttendance = async (empId, status) => {
    try {
      setLoading(true);
      const payload: any = {
        employee_id: empId,
        date: selectedDate,
        status,
        check_in_time: status === 'present' ? new Date().toISOString() : null,
        check_out_time: null,
      };
      if (companyId) payload.company_id = companyId;
      const { error } = await supabase.from('attendance').upsert(payload, { onConflict: 'employee_id,date' });
      if (error) throw error;
      Alert.alert('Success', 'Attendance marked');
      // Refresh
      const { data } = await supabase.from('attendance').select('*').eq('date', selectedDate);
      setAllAttendance(data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateTotalHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100;
  };

  // Get company_id if needed
  const companyId = profileData?.profile?.company_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Management</Text>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportAttendance}>
          <Ionicons name="download" size={20} color="#3b82f6" />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Admin/Manager View: List all employees and mark attendance */}
      {isAdminOrManager && (
        <View style={styles.managerContainer}>
          <View style={styles.managerHeader}>
            <Text style={styles.managerTitle}>Employee Attendance for {formatDate(selectedDate)}</Text>
            <Text style={styles.managerSubtitle}>Tap status buttons to mark attendance</Text>
          </View>
          
          <FlatList
            data={employees}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const att = getEmployeeAttendance(item.id);
              const badge = getStatusBadge(att?.status);
              return (
                <View style={styles.employeeCard}>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{item.name}</Text>
                    <Text style={styles.employeeDetails}>{item.position} • {item.department}</Text>
                    {att?.check_in_time && (
                      <Text style={styles.attendanceTime}>
                        Check-in: {formatTime(att.check_in_time)}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.attendanceActions}>
                    <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
                      <Text style={styles.statusBadgeText}>{badge.label}</Text>
                    </View>
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.actionButton, att?.status === 'present' && styles.activeActionButton]}
                        onPress={() => markAttendance(item.id, 'present')}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={att?.status === 'present' ? '#fff' : '#10b981'} />
                        <Text style={[styles.actionButtonText, att?.status === 'present' && styles.activeActionButtonText]}>
                          Present
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, att?.status === 'absent' && styles.activeActionButton]}
                        onPress={() => markAttendance(item.id, 'absent')}
                      >
                        <Ionicons name="close-circle" size={16} color={att?.status === 'absent' ? '#fff' : '#ef4444'} />
                        <Text style={[styles.actionButtonText, att?.status === 'absent' && styles.activeActionButtonText]}>
                          Absent
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, att?.status === 'late' && styles.activeActionButton]}
                        onPress={() => markAttendance(item.id, 'late')}
                      >
                        <Ionicons name="time" size={16} color={att?.status === 'late' ? '#fff' : '#f59e0b'} />
                        <Text style={[styles.actionButtonText, att?.status === 'late' && styles.activeActionButtonText]}>
                          Late
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, att?.status === 'half_day' && styles.activeActionButton]}
                        onPress={() => markAttendance(item.id, 'half_day')}
                      >
                        <Ionicons name="remove-circle" size={16} color={att?.status === 'half_day' ? '#fff' : '#64748b'} />
                        <Text style={[styles.actionButtonText, att?.status === 'half_day' && styles.activeActionButtonText]}>
                          Half Day
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}
      {/* Employee View: Check In/Out, Today’s Status, History */}
      {isEmployee && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#10b981', padding: 12, borderRadius: 8, marginRight: 8 }}
            onPress={async () => {
              try {
                if (!companyId) throw new Error('No company ID');
                const employeeId = profileData?.profile?.id;
                if (!employeeId) throw new Error('No employee ID');
                
                const timeString = new Date().toISOString();
                const today = new Date().toISOString().split('T')[0];
                
                // 1. Try to fetch existing attendance record
                const { data: existing, error: fetchError } = await supabase
                  .from('attendance')
                  .select('id')
                  .eq('employee_id', employeeId)
                  .eq('company_id', companyId)
                  .eq('date', today)
                  .maybeSingle();
                
                if (fetchError) {
                  console.error('Fetch error:', fetchError);
                  throw fetchError;
                }
                
                if (existing) {
                  // 2. Update existing record
                  const { error } = await supabase
                    .from('attendance')
                    .update({ 
                      check_in_time: timeString, 
                      status: 'present',
                      updated_at: timeString
                    })
                    .eq('id', existing.id);
                  if (error) {
                    console.error('Update error:', error);
                    throw error;
                  }
                } else {
                  // 3. Insert new record
                  const { error } = await supabase
                    .from('attendance')
                    .insert({
                      employee_id: employeeId,
                      company_id: companyId,
                      date: today,
                      check_in_time: timeString,
                      status: 'present',
                      created_at: timeString,
                      updated_at: timeString
                    });
                  if (error) {
                    console.error('Insert error:', error);
                    throw error;
                  }
                }
                Alert.alert('Success', 'Checked in successfully');
                loadAttendanceRecords();
              } catch (err) {
                console.error('Check-in error:', err);
                Alert.alert('Check-in Failed', err.message || 'Unknown error');
              }
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Check In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: '#3b82f6', padding: 12, borderRadius: 8 }}
            onPress={async () => {
              try {
                if (!companyId) throw new Error('No company ID');
                const employeeId = profileData?.profile?.id;
                if (!employeeId) throw new Error('No employee ID');
                
                const timeString = new Date().toISOString();
                const today = new Date().toISOString().split('T')[0];
                
                const result = await supabase.from('attendance').update({
                  check_out_time: timeString,
                  updated_at: timeString
                }).eq('employee_id', employeeId).eq('company_id', companyId).eq('date', today);
                if (result.error) throw result.error;
                Alert.alert('Success', 'Checked out successfully');
                loadAttendanceRecords();
              } catch (err) {
                console.error('Check-out error:', err);
                Alert.alert('Check-out Failed', err.message || 'Unknown error');
              }
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Check Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => handleDateChange('prev')}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <Ionicons name="calendar" size={20} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDateChange('next')}>
          <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.scrollView}
        data={attendanceRecords}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading attendance records...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>No attendance records found</Text>
            </View>
          )
        }
        renderItem={({ item: record }) => (
          <View style={styles.attendanceCard}>
            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName}>{record.employee_name}</Text>
              <Text style={styles.employeeId}>ID: {record.employee_id}</Text>
            </View>

            <View style={styles.attendanceDetails}>
              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Check In</Text>
                  <Text style={styles.timeValue}>{formatTime(record.check_in_time)}</Text>
                </View>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Check Out</Text>
                  <Text style={styles.timeValue}>{formatTime(record.check_out_time)}</Text>
                </View>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Total Hours</Text>
                  <Text style={styles.timeValue}>
                    {calculateTotalHours(record.check_in_time, record.check_out_time)}h
                  </Text>
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
        )}
      />

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(selectedDate)}
          mode="date"
          display="default"
          onChange={handleDatePickerChange}
          maximumDate={new Date()}
        />
      )}
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
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  // Manager view styles
  managerContainer: {
    flex: 1,
    padding: 16,
  },
  managerHeader: {
    marginBottom: 16,
  },
  managerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  managerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  employeeInfo: {
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  employeeDetails: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  attendanceTime: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  attendanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  activeActionButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  activeActionButtonText: {
    color: '#fff',
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
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
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