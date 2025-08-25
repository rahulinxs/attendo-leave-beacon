import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';
import { APP_NAME } from '../branding';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface AnalyticsData {
  attendanceRate?: number;
  presentDays?: number;
  totalDays?: number;
  totalLeaveRequests?: number;
  approvedLeave?: number;
  pendingLeave?: number;
  userRole?: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  dateRangeContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  dateRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  dateRangeButtonActive: {
    backgroundColor: '#2563eb',
  },
  dateRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  dateRangeButtonTextActive: {
    color: '#fff',
  },
  filterContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  datePickerText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  pickerContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  picker: {
    height: 50,
  },
  metricsContainer: {
    padding: 20,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 12,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
  },
  roleValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
  },
  metricDetail: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  metricInsight: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  insightText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  leaveBreakdown: {
    marginVertical: 12,
  },
  leaveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  leaveText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
});

const ReportsScreen = () => {
  const { profileData } = useUserProfile();
  const [analytics, setAnalytics] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [teams, setTeams] = useState([]);
  const [dateRange, setDateRange] = useState('month'); // week, month, quarter, year

  useEffect(() => {
    fetchAnalytics();
    fetchTeams();
  }, [profileData, selectedDate, selectedTeam, dateRange]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const getDateRangeText = () => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return selectedDate.toLocaleDateString('en-US', options);
  };

  const fetchAnalytics = async () => {
    if (!profileData?.profile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userRole = profileData.profile.role;
      const userId = profileData.profile.id;
      const companyId = profileData.profile.company_id;

      let attendanceQuery = supabase.from('attendance').select('*');
      let leaveQuery = supabase.from('leave_requests').select('*');

      // Apply role-based filtering
      if (userRole === 'super_admin') {
        // Super admin sees all data
      } else if (userRole === 'admin') {
        // Admin sees company data
        attendanceQuery = attendanceQuery.eq('company_id', companyId);
        leaveQuery = leaveQuery.eq('company_id', companyId);
      } else if (userRole === 'reporting_manager') {
        // Manager sees team data
        const teamMemberIds = await getTeamMemberIds(userId);
        attendanceQuery = attendanceQuery.in('employee_id', teamMemberIds);
        leaveQuery = leaveQuery.in('employee_id', teamMemberIds);
      } else {
        // Employee sees only their data
        attendanceQuery = attendanceQuery.eq('employee_id', userId);
        leaveQuery = leaveQuery.eq('employee_id', userId);
      }

      const [attendanceResult, leaveResult] = await Promise.all([
        attendanceQuery,
        leaveQuery
      ]);

      if (attendanceResult.error) throw attendanceResult.error;
      if (leaveResult.error) throw leaveResult.error;

      const attendanceData = attendanceResult.data || [];
      const leaveData = leaveResult.data || [];

      // Calculate analytics
      const analyticsData = calculateAnalytics(attendanceData, leaveData, userRole);
      setAnalytics(analyticsData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    if (!profileData?.profile) return;
    const { data, error } = await supabase.from('teams').select('id, name');
    if (!error && data) setTeams(data);
  };

  const getTeamMemberIds = async (managerId) => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('reporting_manager_id', managerId);
    return data?.map(p => p.id) || [];
  };

  const calculateAnalytics = (attendanceData, leaveData, userRole) => {
    const totalDays = attendanceData.length;
    const presentDays = attendanceData.filter(a => a.check_in_time).length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    const totalLeaveRequests = leaveData.length;
    const approvedLeave = leaveData.filter(l => l.status === 'approved').length;
    const pendingLeave = leaveData.filter(l => l.status === 'pending').length;

    return {
      attendanceRate,
      totalDays,
      presentDays,
      totalLeaveRequests,
      approvedLeave,
      pendingLeave,
      userRole
    };
  };

  const getScopeText = () => {
    switch (analytics.userRole) {
      case 'super_admin': return 'All Companies';
      case 'admin': return 'Your Company';
      case 'reporting_manager': return 'Your Team';
      case 'employee': return 'Your Data';
      default: return '';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="analytics-outline" size={48} color="#2563eb" />
          <Text style={styles.title}>Loading Reports...</Text>
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.title}>Reports Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="analytics" size={32} color="#2563eb" />
            <Text style={styles.title}>Analytics Dashboard</Text>
          </View>
          <Text style={styles.subtitle}>{getScopeText()}</Text>
        </View>

        {/* Date Range Selector */}
        <View style={styles.dateRangeContainer}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.dateRangeButtons}>
            {['week', 'month', 'quarter', 'year'].map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.dateRangeButton,
                  dateRange === range && styles.dateRangeButtonActive
                ]}
                onPress={() => setDateRange(range)}
              >
                <Text style={[
                  styles.dateRangeButtonText,
                  dateRange === range && styles.dateRangeButtonTextActive
                ]}>
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Picker */}
        <View style={styles.filterContainer}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <TouchableOpacity 
            style={styles.datePickerButton} 
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#2563eb" />
            <Text style={styles.datePickerText}>{getDateRangeText()}</Text>
            <Ionicons name="chevron-down-outline" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Team Filter */}
        {['admin', 'super_admin', 'reporting_manager'].includes(profileData?.profile?.role) && (
          <View style={styles.filterContainer}>
            <Text style={styles.sectionTitle}>Team Filter</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedTeam}
                style={styles.picker}
                onValueChange={(itemValue) => setSelectedTeam(itemValue)}
              >
                <Picker.Item label="All Teams" value="all" />
                {teams.map(team => (
                  <Picker.Item key={team.id} label={team.name} value={team.id} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Metrics Cards */}
        <View style={styles.metricsContainer}>
          {/* Attendance Rate Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.metricTitle}>Attendance Rate</Text>
            </View>
            <Text style={styles.metricValue}>{analytics.attendanceRate ?? 0}%</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${analytics.attendanceRate ?? 0}%`, backgroundColor: '#10b981' }
                ]} 
              />
            </View>
            <Text style={styles.metricDetail}>
              {analytics.presentDays ?? 0} present out of {analytics.totalDays ?? 0} total days
            </Text>
            <View style={styles.metricInsight}>
              <Text style={styles.insightText}>
                {(analytics.attendanceRate ?? 0) >= 90 ? '🎉 Excellent attendance!' : 
                 (analytics.attendanceRate ?? 0) >= 75 ? '👍 Good attendance' : 
                 '⚠️ Needs improvement'}
              </Text>
            </View>
          </View>

          {/* Leave Requests Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="calendar" size={24} color="#f59e0b" />
              <Text style={styles.metricTitle}>Leave Requests</Text>
            </View>
            <Text style={styles.metricValue}>{analytics.totalLeaveRequests ?? 0}</Text>
            <View style={styles.leaveBreakdown}>
              <View style={styles.leaveItem}>
                <View style={[styles.leaveIndicator, { backgroundColor: '#10b981' }]} />
                <Text style={styles.leaveText}>Approved: {analytics.approvedLeave ?? 0}</Text>
              </View>
              <View style={styles.leaveItem}>
                <View style={[styles.leaveIndicator, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.leaveText}>Pending: {analytics.pendingLeave ?? 0}</Text>
              </View>
              <View style={styles.leaveItem}>
                <View style={[styles.leaveIndicator, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.leaveText}>
                  Rejected: {(analytics.totalLeaveRequests ?? 0) - (analytics.approvedLeave ?? 0) - (analytics.pendingLeave ?? 0)}
                </Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${((analytics.approvedLeave ?? 0) / Math.max(analytics.totalLeaveRequests ?? 1, 1)) * 100}%`, 
                    backgroundColor: '#10b981' 
                  }
                ]} 
              />
            </View>
          </View>

          {/* Quick Stats Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="person-circle" size={24} color="#2563eb" />
              <Text style={styles.metricTitle}>Your Access Level</Text>
            </View>
            <Text style={styles.roleValue}>{analytics.userRole?.replace('_', ' ').toUpperCase() ?? ''}</Text>
            <Text style={styles.metricDetail}>
              {analytics.userRole === 'super_admin' ? 'Full system access across all companies' :
               analytics.userRole === 'admin' ? 'Company-wide data and management access' :
               analytics.userRole === 'reporting_manager' ? 'Team data and reporting access' :
               'Personal data access only'}
            </Text>
          </View>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ReportsScreen;