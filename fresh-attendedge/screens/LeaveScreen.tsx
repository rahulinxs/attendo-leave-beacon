import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Platform, 
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Modal
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';
import { APP_NAME } from '../branding';
import Collapsible from 'react-native-collapsible';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../src/components/ScreenWrapper';

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
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Collapsible sections - start with all collapsed for better UX
  const [balancesOpen, setBalancesOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    fetchLeaveData();
  }, [profileData]);

  const initializeLeaveBalances = async (userId: string, companyId: string): Promise<boolean> => {
    try {
      // First, check if user already has any leave balances
      const { count, error: countError } = await supabase
        .from('leave_balances')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', userId)
        .eq('year', new Date().getFullYear());

      if (countError) throw countError;
      
      // If no leave balances exist for this year, initialize them
      if (count === 0) {
        // Get all active leave types
        const { data: leaveTypes, error: typesError } = await supabase
          .from('leave_types')
          .select('id, max_days_per_year')
          .eq('is_active', true);
        
        if (typesError) throw typesError;
        
        if (leaveTypes && leaveTypes.length > 0) {
          // Create leave balance records for each leave type
          const { error: insertError } = await supabase
            .from('leave_balances')
            .insert(
              leaveTypes.map(type => ({
                employee_id: userId,
                leave_type_id: type.id,
                year: new Date().getFullYear(),
                allocated_days: type.max_days_per_year,
                used_days: 0,
                company_id: companyId
              }))
            );
            
          if (insertError) throw insertError;
          return true; // New balances were created
        }
      }
      return false; // Balances already existed or no leave types found
    } catch (error) {
      console.error('Error initializing leave balances:', error);
      return false;
    }
  };

  const fetchLeaveData = async () => {
    if (!profileData?.profile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userId = profileData.profile.id;
      const userRole = profileData.profile.role;
      const companyId = profileData.profile.company_id;
      const currentYear = new Date().getFullYear();
      
      // Initialize leave balances if they don't exist
      await initializeLeaveBalances(userId, companyId);

      // First, fetch all approved leave requests for the current year
      const { data: approvedLeaves, error: leavesError } = await supabase
        .from('leave_requests')
        .select('leave_type_id, total_days')
        .eq('employee_id', userId)
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .gte('start_date', `${currentYear}-01-01`)
        .lte('end_date', `${currentYear}-12-31`);

      if (leavesError) throw leavesError;
      console.log('Approved leaves:', approvedLeaves); // Debug log

      // Calculate used days per leave type
      const usedDaysMap = new Map();
      approvedLeaves?.forEach(leave => {
        console.log('Processing leave:', leave); // Debug log
        const current = usedDaysMap.get(leave.leave_type_id) || 0;
        usedDaysMap.set(leave.leave_type_id, current + (leave.total_days || 0));
      });
      console.log('Used days map:', Object.fromEntries(usedDaysMap)); // Debug log

      // Fetch leave types with their max allocation
      const { data: leaveTypes, error: typesError } = await supabase
        .from('leave_types')
        .select('id, name, max_days_per_year, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (typesError) throw typesError;
      console.log('Leave types:', leaveTypes); // Debug log
      setLeaveTypes(leaveTypes || []);

      // Format leave balances with calculated used days
      const formattedBalances = (leaveTypes || []).map(type => {
        const usedDays = usedDaysMap.get(type.id) || 0;
        const allocatedDays = type.max_days_per_year;
        const remainingDays = Math.max(0, allocatedDays - usedDays);
        
        console.log('Type:', type.name, 'Allocated:', allocatedDays, 'Used:', usedDays, 'Remaining:', remainingDays); // Debug log
        
        return {
          leave_type_id: type.id,
          leave_type_name: type.name,
          max_days_per_year: allocatedDays,
          allocated_days: allocatedDays,
          used_days: usedDays,
          remaining_days: remainingDays,
          company_id: companyId
        };
      });
      
      console.log('Formatted balances:', formattedBalances); // Debug log
      setLeaveBalances(formattedBalances);

      // Fetch leave history with leave type names
      let leaveQuery = supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types (
            name
          )
        `)
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
        if (teamMemberIds.length > 0) {
          leaveQuery = leaveQuery.in('employee_id', teamMemberIds);
        } else {
          // If no team members, show only manager's own requests
          leaveQuery = leaveQuery.eq('employee_id', userId);
        }
      } else {
        // Employee sees only their leave requests
        leaveQuery = leaveQuery.eq('employee_id', userId);
      }

      const { data: leaveData, error: leaveError } = await leaveQuery;
      if (leaveError) throw leaveError;
      
      // Transform the data to ensure leave_type_name is properly set
      const formattedLeaveHistory = (leaveData || []).map(leave => ({
        ...leave,
        leave_type_name: leave.leave_types?.name || 'Unknown Leave Type',
        days: leave.total_days || 0
      }));
      
      console.log('Formatted leave history:', formattedLeaveHistory);
      setLeaveHistory(formattedLeaveHistory);

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

  // Add this helper function to calculate days between dates (inclusive)
  const calculateDaysBetween = (startDateStr, endDateStr) => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    // Calculate difference in milliseconds, convert to days and add 1 to include both start and end dates
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const submitLeaveRequest = async () => {
    if (!selectedLeaveTypeId || !startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Calculate total days
    const totalDays = calculateDaysBetween(startDate, endDate);
    
    setRequesting(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: profileData.profile.id,
          company_id: profileData.profile.company_id,
          leave_type_id: selectedLeaveTypeId,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          reason: reason,
          status: 'pending'
        });

      if (error) throw error;

      Alert.alert('Success', 'Leave request submitted successfully');
      
      // Reset form
      setSelectedLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setReason('');
      
      // Refresh data
      fetchLeaveData();

    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit leave request');
      console.error('Leave request error:', err);
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
        <Text style={styles.title}> Leave</Text>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}> Leave</Text>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  // Get user's company ID
  const userCompanyId = profileData?.profile?.company_id;
  
  // Calculate leave balance summary based on active leave types and their quotas for user's company
  const activeLeaveBalances = leaveBalances.filter(balance => {
    // Directly check the balance properties since we already have the leave type info
    return balance.is_active !== false && 
           (balance.allocated_days || 0) > 0 && 
           balance.company_id === userCompanyId;
  });

  // Calculate totals from active leave balances for user's company
  const totalAllocated = activeLeaveBalances.reduce(
    (sum, balance) => sum + (balance.allocated_days || 0), 0
  );
  
  const totalUsed = activeLeaveBalances.reduce(
    (sum, balance) => sum + (balance.used_days || 0), 0
  );
  
  const totalRemaining = Math.max(0, totalAllocated - totalUsed);
  const activeLeaveTypesCount = activeLeaveBalances.length;
  
  // Debug logs
  console.log('User Company ID:', userCompanyId);
  console.log('All Leave Balances:', JSON.stringify(leaveBalances, null, 2));
  console.log('Filtered Leave Balances:', JSON.stringify(activeLeaveBalances, null, 2));
  console.log('Calculated Totals:', {
    totalRemaining,
    totalAllocated,
    totalUsed,
    activeLeaveTypesCount
  });

  // Since leave types are already filtered by company_id in the query, use them directly
  // But add fallback filtering just in case
  const companyLeaveTypes = leaveTypes.length > 0 ? leaveTypes : [];
  
  console.log('All leave types:', leaveTypes);
  console.log('Company leave types for dropdown:', companyLeaveTypes);
  console.log('User company ID:', userCompanyId);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          
          <View style={styles.container}>
            
            
            <Text style={styles.title}>Leave</Text>
          </View>
          
          {/* Leave Balance Section */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Leave Balance</Text>
            <View style={styles.summaryContent}>
              <View style={styles.balanceCardGrid}>
                <Text style={styles.balanceType}>Total Allocated</Text>
                <Text style={styles.balanceRemaining}>{totalAllocated} days</Text>
                <Text style={styles.balanceLabel}>Total allocated days across all leave types</Text>
              </View>
              <View style={styles.balanceCardGrid}>
                <Text style={styles.balanceType}>Total Used</Text>
                <Text style={styles.balanceRemaining}>{totalUsed} days</Text>
                <Text style={styles.balanceLabel}>Total used days across all leave types</Text>
              </View>
              <View style={styles.balanceCardGrid}>
                <Text style={styles.balanceType}>Total Remaining</Text>
                <Text style={styles.balanceRemaining}>{totalRemaining} days</Text>
                <Text style={styles.balanceLabel}>Total remaining days across all leave types</Text>
              </View>
            </View>
          </View>

          {/* Leave History Section */}
              <View style={styles.sectionContainer}>
                <TouchableOpacity 
                  style={styles.sectionHeader} 
                  onPress={() => setHistoryOpen(!historyOpen)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionTitle}>My Leave History</Text>
                  <Ionicons 
                    name={historyOpen ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#334155" 
                  />
                </TouchableOpacity>
                <Collapsible 
                  collapsed={!historyOpen}
                  duration={300}
                  easing="easeInOutCubic"
                >
                  <View style={styles.collapsibleContent}>
                    {loading ? (
                      <View style={styles.emptyContainer}>
                        <ActivityIndicator size="small" color="#3B82F6" />
                        <Text style={[styles.emptyText, { marginTop: 8 }]}>Loading leave history...</Text>
                      </View>
                    ) : error ? (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="warning" size={24} color="#EF4444" />
                        <Text style={[styles.emptyText, { color: '#EF4444', marginTop: 8 }]}>
                          Failed to load leave history. Please try again.
                        </Text>
                      </View>
                    ) : leaveHistory.length > 0 ? (
                      leaveHistory.map((item) => (
                        <View key={`${item.id}-${item.start_date}`} style={styles.historyItem}>
                          <View style={styles.historyItemHeader}>
                            <Text style={styles.leaveType}>
                              {item.leave_type_name || 'Leave'}
                            </Text>
                            <View style={[
                              styles.statusBadge, 
                              { backgroundColor: getStatusColor(item.status) }
                            ]}>
                              <Text style={[
                                styles.statusText, 
                                { color: getStatusColor(item.status) }
                              ]}>
                                {item.status?.toUpperCase() || 'PENDING'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.historyItemDates}>
                            <Text style={styles.dateText}>
                              {item.start_date && item.end_date 
                                ? `${new Date(item.start_date).toLocaleDateString()} - ${new Date(item.end_date).toLocaleDateString()}`
                                : 'Date not specified'}
                            </Text>
                            <Text style={styles.daysText}>
                              {item.days || item.total_days || 0} {Math.abs(item.days || item.total_days || 0) === 1 ? 'day' : 'days'}
                            </Text>
                          </View>
                          {item.reason && (
                            <Text style={styles.reasonText} numberOfLines={2}>
                              {item.reason}
                            </Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No leave history found</Text>
                      </View>
                    )}
                  </View>
                </Collapsible>
              </View>

              {/* Request Leave Section */}
              <View style={styles.sectionContainer}>
                <TouchableOpacity 
                  style={styles.sectionHeader} 
                  onPress={() => setRequestOpen(!requestOpen)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionTitle}>Request Leave</Text>
                  <Ionicons 
                    name={requestOpen ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#334155" 
                  />
                </TouchableOpacity>
                <Collapsible 
                  collapsed={!requestOpen}
                  duration={300}
                  easing="easeInOutCubic"
                >
                  <View style={styles.formContainer}>
                    <Text style={styles.label}>Leave Type</Text>
                    <TouchableOpacity 
                      style={[styles.input, { 
                        flexDirection: 'row', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        paddingRight: 12
                      }]}
                      onPress={() => setShowLeaveTypeModal(true)}
                    >
                      <Text style={{ color: selectedLeaveTypeId ? '#000' : '#9ca3af' }}>
                        {selectedLeaveTypeId 
                          ? companyLeaveTypes.find(lt => lt.id === selectedLeaveTypeId)?.name 
                          : 'Select leave type'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#6b7280" />
                    </TouchableOpacity>

                    <View style={styles.dateRow}>
                      <View style={styles.dateInput}>
                        <Text style={styles.label}>Start Date</Text>
                        <TouchableOpacity 
                          style={styles.dateButton}
                          onPress={() => setShowStartPicker(true)}
                        >
                          <Text style={styles.dateButtonText}>
                            {startDate || 'Select start date'}
                          </Text>
                        </TouchableOpacity>
                        {showStartPicker && (
                          <DateTimePicker
                            value={startDate ? new Date(startDate) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                              setShowStartPicker(Platform.OS === 'ios');
                              if (selectedDate) {
                                setStartDate(selectedDate.toISOString().split('T')[0]);
                              }
                            }}
                            minimumDate={new Date()}
                          />
                        )}
                      </View>

                      <View style={styles.dateInput}>
                        <Text style={styles.label}>End Date</Text>
                        <TouchableOpacity 
                          style={styles.dateButton}
                          onPress={() => setShowEndPicker(true)}
                          disabled={!startDate}
                        >
                          <Text style={[
                            styles.dateButtonText,
                            !startDate && { color: '#9ca3af' }
                          ]}>
                            {endDate || 'Select end date'}
                          </Text>
                        </TouchableOpacity>
                        {showEndPicker && (
                          <DateTimePicker
                            value={endDate ? new Date(endDate) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                              setShowEndPicker(Platform.OS === 'ios');
                              if (selectedDate) {
                                setEndDate(selectedDate.toISOString().split('T')[0]);
                              }
                            }}
                            minimumDate={startDate ? new Date(startDate) : new Date()}
                          />
                        )}
                      </View>
                    </View>

                    <Text style={[styles.label, { marginTop: 16 }]}>Reason</Text>
                    <TextInput
                      style={[styles.input, { 
                        height: 100, 
                        textAlignVertical: 'top',
                        padding: 12
                      }]}
                      placeholder="Enter reason for leave"
                      placeholderTextColor="#94a3b8"
                      value={reason}
                      onChangeText={setReason}
                      multiline
                      numberOfLines={4}
                    />

                    <TouchableOpacity 
                      style={[styles.button, { 
                        opacity: requesting ? 0.7 : 1,
                      }]} 
                      onPress={submitLeaveRequest}
                      disabled={requesting}
                    >
                      {requesting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Submit Request</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Collapsible>
              </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Leave Type Picker Modal */}
      <Modal
        visible={showLeaveTypeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLeaveTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Leave Type</Text>
              <TouchableOpacity onPress={() => setShowLeaveTypeModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={companyLeaveTypes}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.leaveTypeItem}
                  onPress={() => {
                    setSelectedLeaveTypeId(item.id);
                    setShowLeaveTypeModal(false);
                  }}
                >
                  <Text style={styles.leaveTypeText}>{item.name}</Text>
                  <Text style={styles.leaveTypeDays}>({item.max_days_per_year} days)</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No leave types available</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
    paddingTop: 36,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionContainer: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600',
    color: '#1e293b'
  },
  collapsibleContent: {
    padding: 16,
    paddingTop: 0,
    maxHeight: 400,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#334155',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  dateInput: {
    flex: 1,
    marginBottom: 0,
  },
  dateButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1e293b',
  },
  historyItem: { 
    backgroundColor: '#f8fafc', 
    borderRadius: 8, 
    padding: 16, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  historyItemDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#64748b',
  },
  daysText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  reasonText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#64748b', 
    marginTop: 20 
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  leaveTypeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveTypeText: {
    fontSize: 16,
    color: '#1e293b',
  },
  leaveTypeDays: {
    fontSize: 14,
    color: '#64748b',
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#22223b', 
    marginBottom: 24, 
    textAlign: 'center' 
  },
  errorText: {
    color: '#dc2626',
    marginTop: 16,
    textAlign: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  summaryContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceCardGrid: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '48%',
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  balanceType: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  balanceRemaining: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

export default LeaveScreen;