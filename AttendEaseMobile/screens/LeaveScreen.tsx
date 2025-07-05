import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';
import { APP_NAME } from '../branding';

const LeaveScreen = () => {
  const { profileData } = useUserProfile();
  const [leaveBalance, setLeaveBalance] = useState(0);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requesting, setRequesting] = useState(false);
  
  // Form state
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchLeaveData();
  }, [profileData]);

  const fetchLeaveData = async () => {
    if (!profileData?.profile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userId = profileData.profile.id;
      const userRole = profileData.profile.role;
      const companyId = profileData.profile.company_id;

      // Fetch leave balance
      const { data: balanceData } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', userId)
        .single();
      
      setLeaveBalance(balanceData?.balance || 0);

      // Fetch leave history
      let leaveQuery = supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      if (userRole === 'super_admin') {
        // Super admin sees all leave requests
      } else if (userRole === 'admin') {
        // Admin sees company leave requests
        leaveQuery = leaveQuery.eq('company_id', companyId);
      } else if (userRole === 'reporting_manager') {
        // Manager sees team leave requests
        const teamMemberIds = await getTeamMemberIds(userId);
        leaveQuery = leaveQuery.in('employee_id', teamMemberIds);
      } else {
        // Employee sees only their leave requests
        leaveQuery = leaveQuery.eq('employee_id', userId);
      }

      const { data: leaveData } = await leaveQuery;
      setLeaveHistory(leaveData || []);

      // Fetch leave types
      const { data: typesData } = await supabase
        .from('leave_types')
        .select('*')
        .eq('company_id', companyId);
      
      setLeaveTypes(typesData || []);

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

  const submitLeaveRequest = async () => {
    if (!leaveType || !startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setRequesting(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: profileData.profile.id,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason: reason,
          status: 'pending',
          company_id: profileData.profile.company_id
        });

      if (error) throw error;

      Alert.alert('Success', 'Leave request submitted successfully');
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchLeaveData(); // Refresh data

    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setRequesting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#059669';
      case 'rejected': return '#dc2626';
      case 'pending': return '#d97706';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{APP_NAME} Leave</Text>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{APP_NAME} Leave</Text>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME} Leave</Text>
      
      <View style={styles.balanceCard}>
        <Text style={styles.balanceTitle}>Leave Balance</Text>
        <Text style={styles.balanceValue}>{leaveBalance} days</Text>
      </View>

      <Text style={styles.sectionTitle}>Leave History</Text>
      <FlatList
        data={leaveHistory}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <Text style={styles.historyDate}>{item.start_date} - {item.end_date}</Text>
            <Text style={styles.historyType}>{item.leave_type}</Text>
            <Text style={[styles.historyStatus, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No leave history found</Text>
        }
      />

      <Text style={styles.sectionTitle}>Request Leave</Text>
      <TextInput
        style={styles.input}
        placeholder="Leave Type (e.g. Sick, Casual)"
        value={leaveType}
        onChangeText={setLeaveType}
      />
      <TextInput
        style={styles.input}
        placeholder="Start Date (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
      />
      <TextInput
        style={styles.input}
        placeholder="End Date (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
      />
      <TextInput
        style={styles.input}
        placeholder="Reason"
        value={reason}
        onChangeText={setReason}
        multiline
      />
      <TouchableOpacity 
        style={[styles.button, requesting && styles.buttonDisabled]} 
        onPress={submitLeaveRequest}
        disabled={requesting}
      >
        {requesting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Submit Request</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#22223b', marginBottom: 16, textAlign: 'center' },
  balanceCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  balanceTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  balanceValue: { fontSize: 24, fontWeight: 'bold', color: '#059669' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  historyItem: { backgroundColor: '#e0e7ff', borderRadius: 8, padding: 12, marginBottom: 8 },
  historyDate: { fontSize: 14, fontWeight: '500' },
  historyType: { fontSize: 14, color: '#64748b' },
  historyStatus: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 20 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, backgroundColor: '#f9fafb' },
  button: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, marginTop: 8, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
});

export default LeaveScreen; 