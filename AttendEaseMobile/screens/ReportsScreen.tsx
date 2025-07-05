import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';
import { APP_NAME } from '../branding';

const ReportsScreen = () => {
  const { profileData } = useUserProfile();
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
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
      
      <View style={styles.card}>
        <Text style={styles.metricTitle}>Attendance Rate</Text>
        <Text style={styles.metricValue}>{analytics.attendanceRate}%</Text>
        <Text style={styles.metricDetail}>
          {analytics.presentDays} of {analytics.totalDays} days
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.metricTitle}>Leave Requests</Text>
        <Text style={styles.metricValue}>{analytics.totalLeaveRequests}</Text>
        <Text style={styles.metricDetail}>
          {analytics.approvedLeave} approved, {analytics.pendingLeave} pending
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.metricTitle}>User Role</Text>
        <Text style={styles.metricValue}>{analytics.userRole}</Text>
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
});

export default ReportsScreen; 