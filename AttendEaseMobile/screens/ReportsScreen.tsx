import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';
import { APP_NAME } from '../branding';
import { Picker } from '@react-native-picker/picker';

interface AnalyticsData {
  attendanceRate?: number;
  presentDays?: number;
  totalDays?: number;
  totalLeaveRequests?: number;
  approvedLeave?: number;
  pendingLeave?: number;
  userRole?: string;
}

const ReportsScreen = () => {
  const { profileData } = useUserProfile();
  const [analytics, setAnalytics] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetchAnalytics();
    fetchTeams();
  }, [profileData]);

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
      <View style={styles.container}>
        <Text style={styles.title}>{APP_NAME} Reports</Text>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{APP_NAME} Reports</Text>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{APP_NAME} Reports</Text>
      <Text style={styles.subtitle}>{getScopeText()}</Text>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Date:</Text>
        <TouchableOpacity onPress={() => {/* show date picker */}} style={styles.filterInput}>
          <Text>{selectedDate}</Text>
        </TouchableOpacity>
        {['admin', 'super_admin', 'reporting_manager'].includes(profileData?.profile?.role) && (
          <>
            <Text style={styles.filterLabel}>Team:</Text>
            <Picker
              selectedValue={selectedTeam}
              style={styles.filterInput}
              onValueChange={(itemValue) => setSelectedTeam(itemValue)}
            >
              <Picker.Item label="All" value="all" />
              {teams.map(team => (
                <Picker.Item key={team.id} label={team.name} value={team.id} />
              ))}
            </Picker>
          </>
        )}
      </View>
      {/* Analytics Cards */}
      <View style={styles.card}>
        <Text style={styles.metricTitle}>Attendance Rate</Text>
        <Text style={styles.metricValue}>{analytics.attendanceRate ?? 0}%</Text>
        <View style={styles.barChartContainer}>
          <View style={[styles.bar, { width: `${analytics.attendanceRate ?? 0}%` }]} />
        </View>
        <Text style={styles.metricDetail}>
          {analytics.presentDays ?? 0} of {analytics.totalDays ?? 0} days
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.metricTitle}>Leave Requests</Text>
        <Text style={styles.metricValue}>{analytics.totalLeaveRequests ?? 0}</Text>
        <View style={styles.barChartContainer}>
          <View style={[styles.bar, { width: `${((analytics.approvedLeave ?? 0) / ((analytics.totalLeaveRequests ?? 1))) * 100}%`, backgroundColor: '#10b981' }]} />
          <View style={[styles.bar, { width: `${((analytics.pendingLeave ?? 0) / ((analytics.totalLeaveRequests ?? 1))) * 100}%`, backgroundColor: '#f59e0b' }]} />
        </View>
        <Text style={styles.metricDetail}>
          {analytics.approvedLeave ?? 0} approved, {analytics.pendingLeave ?? 0} pending
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.metricTitle}>User Role</Text>
        <Text style={styles.metricValue}>{analytics.userRole ?? ''}</Text>
        <Text style={styles.metricDetail}>Access level</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#22223b', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  metricTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  metricValue: { fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginBottom: 4 },
  metricDetail: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 16,
    color: '#475569',
    marginRight: 10,
  },
  filterInput: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
    textAlign: 'center',
  },
  barChartContainer: {
    width: '100%',
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 4,
  },
  bar: {
    height: '100%',
    borderRadius: 10,
  },
});

export default ReportsScreen; 