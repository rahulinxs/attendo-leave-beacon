import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';
import { APP_NAME } from '../branding';
import Collapsible from 'react-native-collapsible';
import { Ionicons } from '@expo/vector-icons';

const LeaveScreen = () => {
  const { profileData } = useUserProfile();
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requesting, setRequesting] = useState(false);
  
  // Form state
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Collapsible sections
  const [balancesOpen, setBalancesOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [requestOpen, setRequestOpen] = useState(true);

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

      // Fetch leave balances per type
      const { data: balancesData } = await supabase
        .from('leave_balances')
        .select('leave_type_id, allocated_days, used_days, remaining_days, leave_types(name)')
        .eq('employee_id', userId)
        .eq('company_id', companyId);
      setLeaveBalances(balancesData || []);

      // Fetch leave history
      let leaveQuery = supabase
        .from('leave_requests')
        .select('*')
        .eq('company_id', companyId)
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
    if (!selectedLeaveTypeId || !startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setRequesting(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: profileData.profile.id,
          leave_type_id: selectedLeaveTypeId,
          start_date: startDate,
          end_date: endDate,
          reason: reason,
          status: 'pending',
          company_id: profileData.profile.company_id
        });

      if (error) throw error;

      Alert.alert('Success', 'Leave request submitted successfully');
      setSelectedLeaveTypeId('');
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
      
      {/* Leave Balances (Collapsible) */}
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setBalancesOpen(o => !o)}>
        <Text style={styles.sectionTitle}>My Leave Balances</Text>
        <Ionicons name={balancesOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#334155" />
      </TouchableOpacity>
      <Collapsible collapsed={!balancesOpen}>
        <FlatList
          data={leaveBalances}
          keyExtractor={(item) => item.leave_type_id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => (
            <View style={styles.balanceCardGrid}>
              <Text style={styles.balanceType}>{item.leave_types?.name || 'Leave'}</Text>
              <View style={{ marginTop: 6 }}>
                <Text style={styles.balanceRemaining}>{item.remaining_days ?? Math.max((item.allocated_days || 0) - (item.used_days || 0), 0)}</Text>
                <Text style={styles.balanceLabel}>Remaining</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(((item.used_days || 0) / Math.max(item.allocated_days || 1, 1)) * 100, 100)}%` }]} />
              </View>
              <Text style={styles.balanceMeta}>{item.used_days || 0} of {item.allocated_days || 0} days used</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No leave balances found</Text>}
        />
      </Collapsible>

      <TouchableOpacity style={styles.sectionHeader} onPress={() => setHistoryOpen(o => !o)}>
        <Text style={styles.sectionTitle}>My Leave History</Text>
        <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#334155" />
      </TouchableOpacity>
      <Collapsible collapsed={!historyOpen}>
        <FlatList
          data={leaveHistory}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <Text style={styles.historyDate}>{item.start_date} - {item.end_date}</Text>
              <Text style={styles.historyType}>{item.leave_type || item.leave_type_name}</Text>
              <Text style={[styles.historyStatus, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No leave history found</Text>}
        />
      </Collapsible>

      <TouchableOpacity style={styles.sectionHeader} onPress={() => setRequestOpen(o => !o)}>
        <Text style={styles.sectionTitle}>Request Leave</Text>
        <Ionicons name={requestOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#334155" />
      </TouchableOpacity>
      <Collapsible collapsed={!requestOpen}>
      {/* Leave type chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {leaveTypes.map((lt) => (
          <TouchableOpacity
            key={lt.id}
            onPress={() => setSelectedLeaveTypeId(lt.id)}
            style={[styles.chip, selectedLeaveTypeId === lt.id && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selectedLeaveTypeId === lt.id && styles.chipTextSelected]}>{lt.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Start Date (YYYY-MM-DD)"
        value={startDate}
        onFocus={() => setShowStartPicker(true)}
        onChangeText={setStartDate}
      />
      <TextInput
        style={styles.input}
        placeholder="End Date (YYYY-MM-DD)"
        value={endDate}
        onFocus={() => setShowEndPicker(true)}
        onChangeText={setEndDate}
      />
      <TextInput
        style={styles.input}
        placeholder="Reason"
        value={reason}
        onChangeText={setReason}
        multiline
      />
      {showStartPicker && (
        <DateTimePicker
          value={startDate ? new Date(startDate) : new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => { setShowStartPicker(false); if (d) setStartDate(d.toISOString().slice(0,10)); }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate ? new Date(endDate) : new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => { setShowEndPicker(false); if (d) setEndDate(d.toISOString().slice(0,10)); }}
        />
      )}
      </Collapsible>
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