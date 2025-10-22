import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAttendance } from '../lib/useAttendance';
import { useUserProfile } from '../lib/useUserProfile';
import { supabase } from '../lib/supabase';
import { ScreenWrapper } from '../src/components/ScreenWrapper';

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
  const [employees, setEmployees] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    notMarked: 0
  });
  const { profileData } = useUserProfile();
  const { checkIn, checkOut } = useAttendance();

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const companyId = profileData?.profile?.company_id;
      const userRole = profileData?.profile?.role;
      const isAdminOrManager = userRole === 'admin' || userRole === 'super_admin' || userRole === 'reporting_manager';
      
      if (isAdminOrManager && companyId) {
        // Load employees and their attendance
        const [employeesResult, attendanceResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, name, email, position, department, role')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('attendance')
            .select('*')
            .eq('date', selectedDate)
            .eq('company_id', companyId)
        ]);
        
        if (employeesResult.error) throw employeesResult.error;
        if (attendanceResult.error) throw attendanceResult.error;
        
        setEmployees(employeesResult.data || []);
        setAllAttendance(attendanceResult.data || []);
        
        // Calculate summary
        const totalEmployees = employeesResult.data?.length || 0;
        const attendanceData = attendanceResult.data || [];
        const summary = {
          totalEmployees,
          present: attendanceData.filter(a => a.status === 'present').length,
          absent: attendanceData.filter(a => a.status === 'absent').length,
          late: attendanceData.filter(a => a.status === 'late').length,
          halfDay: attendanceData.filter(a => a.status === 'half_day').length,
          notMarked: totalEmployees - attendanceData.length
        };
        setAttendanceSummary(summary);
      } else {
        // Load user's own attendance
        const employeeId = profileData?.profile?.id;
        if (employeeId && companyId) {
          const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('company_id', companyId)
            .eq('date', selectedDate)
            .maybeSingle();
          
          if (error && error.code !== 'PGRST116') throw error;
          setTodayAttendance(data);
        }
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
      Alert.alert('Error', 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendanceData();
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
              loadAttendanceData();
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
    loadAttendanceData();
  }, [selectedDate, profileData]);

  // Determine role
  const userRole = profileData?.profile?.role;
  const isAdminOrManager = userRole === 'admin' || userRole === 'super_admin' || userRole === 'reporting_manager';
  const isEmployee = userRole === 'employee';

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
      const companyId = profileData?.profile?.company_id;
      if (!companyId) return;
      
      const payload: any = {
        employee_id: empId,
        date: selectedDate,
        status,
        check_in_time: status === 'present' || status === 'late' ? new Date().toISOString() : null,
        check_out_time: null,
        company_id: companyId
      };
      
      const { error } = await supabase.from('attendance').upsert(payload, { onConflict: 'employee_id,date' });
      if (error) throw error;
      
      Alert.alert('Success', 'Attendance marked successfully');
      await loadAttendanceData();
    } catch (e) {
      console.error('Mark attendance error:', e);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  // Employee check-in/check-out functions
  const handleCheckIn = async () => {
    try {
      const companyId = profileData?.profile?.company_id;
      const employeeId = profileData?.profile?.id;
      if (!companyId || !employeeId) return;
      
      const timeString = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      
      const payload = {
        employee_id: employeeId,
        company_id: companyId,
        date: today,
        check_in_time: timeString,
        status: 'present',
        created_at: timeString,
        updated_at: timeString
      };
      
      const { error } = await supabase.from('attendance').upsert(payload, { onConflict: 'employee_id,date' });
      if (error) throw error;
      
      Alert.alert('Success', 'Checked in successfully');
      await loadAttendanceData();
    } catch (err) {
      console.error('Check-in error:', err);
      Alert.alert('Check-in Failed', err.message || 'Unknown error');
    }
  };

  const handleCheckOut = async () => {
    try {
      const companyId = profileData?.profile?.company_id;
      const employeeId = profileData?.profile?.id;
      if (!companyId || !employeeId) return;
      
      const timeString = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('attendance')
        .update({
          check_out_time: timeString,
          updated_at: timeString
        })
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .eq('date', today);
        
      if (error) throw error;
      
      Alert.alert('Success', 'Checked out successfully');
      await loadAttendanceData();
    } catch (err) {
      console.error('Check-out error:', err);
      Alert.alert('Check-out Failed', err.message || 'Unknown error');
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

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Attendance Management</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportAttendance}>
            <Ionicons name="download" size={20} color="#3b82f6" />
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Date Selector */}
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

        {/* Admin/Manager View */}
        {isAdminOrManager && (
          <ScrollView 
            style={styles.scrollView}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
          {/* Attendance Overview Dashboard */}
          <View style={styles.overviewContainer}>
            <Text style={styles.overviewTitle}>Attendance Overview</Text>
            
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="people" size={24} color="#3b82f6" />
                <Text style={styles.statNumber}>{attendanceSummary.totalEmployees}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                <Text style={styles.statNumber}>{attendanceSummary.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="close-circle" size={24} color="#dc2626" />
                <Text style={styles.statNumber}>{attendanceSummary.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="time" size={24} color="#d97706" />
                <Text style={styles.statNumber}>{attendanceSummary.late}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="remove-circle" size={24} color="#64748b" />
                <Text style={styles.statNumber}>{attendanceSummary.halfDay}</Text>
                <Text style={styles.statLabel}>Half Day</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: '#f9fafb' }]}>
                <Ionicons name="help-circle" size={24} color="#6b7280" />
                <Text style={styles.statNumber}>{attendanceSummary.notMarked}</Text>
                <Text style={styles.statLabel}>Not Marked</Text>
              </View>
            </View>
          </View>

          {/* Employee List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading employees...</Text>
            </View>
          ) : (
            employees.map((employee) => {
              const attendance = getEmployeeAttendance(employee.id);
              const badge = getStatusBadge(attendance?.status);
              
              return (
                <View key={employee.id} style={styles.employeeCard}>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{employee.name}</Text>
                    <Text style={styles.employeeDetails}>
                      {employee.position} • {employee.department}
                    </Text>
                    {attendance?.check_in_time && (
                      <Text style={styles.attendanceTime}>
                        Check-in: {formatTime(attendance.check_in_time)}
                        {attendance?.check_out_time && ` • Check-out: ${formatTime(attendance.check_out_time)}`}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.attendanceActions}>
                    <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
                      <Text style={styles.statusBadgeText}>{badge.label}</Text>
                    </View>
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.actionButton, attendance?.status === 'present' && styles.activeActionButton]}
                        onPress={() => markAttendance(employee.id, 'present')}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={attendance?.status === 'present' ? '#fff' : '#10b981'} />
                        <Text style={[styles.actionButtonText, attendance?.status === 'present' && styles.activeActionButtonText]}>
                          Present
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, attendance?.status === 'absent' && styles.activeActionButton]}
                        onPress={() => markAttendance(employee.id, 'absent')}
                      >
                        <Ionicons name="close-circle" size={16} color={attendance?.status === 'absent' ? '#fff' : '#ef4444'} />
                        <Text style={[styles.actionButtonText, attendance?.status === 'absent' && styles.activeActionButtonText]}>
                          Absent
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, attendance?.status === 'late' && styles.activeActionButton]}
                        onPress={() => markAttendance(employee.id, 'late')}
                      >
                        <Ionicons name="time" size={16} color={attendance?.status === 'late' ? '#fff' : '#f59e0b'} />
                        <Text style={[styles.actionButtonText, attendance?.status === 'late' && styles.activeActionButtonText]}>
                          Late
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, attendance?.status === 'half_day' && styles.activeActionButton]}
                        onPress={() => markAttendance(employee.id, 'half_day')}
                      >
                        <Ionicons name="remove-circle" size={16} color={attendance?.status === 'half_day' ? '#fff' : '#64748b'} />
                        <Text style={[styles.actionButtonText, attendance?.status === 'half_day' && styles.activeActionButtonText]}>
                          Half Day
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

        {/* Employee View */}
        {isEmployee && (
          <ScrollView 
            style={styles.scrollView}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
          {/* Today's Status Card */}
          <View style={styles.todayStatusCard}>
            <Text style={styles.todayStatusTitle}>Today's Attendance</Text>
            {todayAttendance ? (
              <View style={styles.todayStatusContent}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(todayAttendance.status).color }]}>
                    <Text style={styles.statusBadgeText}>{getStatusBadge(todayAttendance.status).label}</Text>
                  </View>
                </View>
                
                <View style={styles.timeRow}>
                  <View style={styles.timeItem}>
                    <Text style={styles.timeLabel}>Check In</Text>
                    <Text style={styles.timeValue}>{formatTime(todayAttendance.check_in_time)}</Text>
                  </View>
                  <View style={styles.timeItem}>
                    <Text style={styles.timeLabel}>Check Out</Text>
                    <Text style={styles.timeValue}>{formatTime(todayAttendance.check_out_time)}</Text>
                  </View>
                  <View style={styles.timeItem}>
                    <Text style={styles.timeLabel}>Total Hours</Text>
                    <Text style={styles.timeValue}>
                      {calculateTotalHours(todayAttendance.check_in_time, todayAttendance.check_out_time)}h
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noAttendanceContainer}>
                <Ionicons name="time-outline" size={48} color="#9ca3af" />
                <Text style={styles.noAttendanceText}>No attendance record for today</Text>
              </View>
            )}
          </View>

          {/* Check In/Out Buttons */}
          <View style={styles.checkInOutContainer}>
            <TouchableOpacity
              style={[styles.checkInButton, todayAttendance?.check_in_time && styles.disabledButton]}
              onPress={handleCheckIn}
              disabled={!!todayAttendance?.check_in_time}
            >
              <Ionicons name="log-in" size={24} color="white" />
              <Text style={styles.checkInOutText}>
                {todayAttendance?.check_in_time ? 'Checked In' : 'Check In'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.checkOutButton, 
                (!todayAttendance?.check_in_time || todayAttendance?.check_out_time) && styles.disabledButton]}
              onPress={handleCheckOut}
              disabled={!todayAttendance?.check_in_time || !!todayAttendance?.check_out_time}
            >
              <Ionicons name="log-out" size={24} color="white" />
              <Text style={styles.checkInOutText}>
                {todayAttendance?.check_out_time ? 'Checked Out' : 'Check Out'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStatsContainer}>
            <Text style={styles.quickStatsTitle}>This Week</Text>
            <View style={styles.quickStatsGrid}>
              <View style={styles.quickStatCard}>
                <Ionicons name="calendar" size={20} color="#3b82f6" />
                <Text style={styles.quickStatNumber}>5</Text>
                <Text style={styles.quickStatLabel}>Days Present</Text>
              </View>
              <View style={styles.quickStatCard}>
                <Ionicons name="time" size={20} color="#10b981" />
                <Text style={styles.quickStatNumber}>40h</Text>
                <Text style={styles.quickStatLabel}>Total Hours</Text>
              </View>
              <View style={styles.quickStatCard}>
                <Ionicons name="trending-up" size={20} color="#f59e0b" />
                <Text style={styles.quickStatNumber}>98%</Text>
                <Text style={styles.quickStatLabel}>Attendance</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

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
    </ScreenWrapper>
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
  // Overview styles
  overviewContainer: {
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
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  // Employee view styles
  todayStatusCard: {
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
  todayStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  todayStatusContent: {
    alignItems: 'center',
  },
  statusRow: {
    marginBottom: 16,
  },
  noAttendanceContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noAttendanceText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
  },
  checkInOutContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  checkInButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    gap: 8,
  },
  checkOutButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  checkInOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickStatsContainer: {
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
  quickStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickStatCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  quickStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
});
