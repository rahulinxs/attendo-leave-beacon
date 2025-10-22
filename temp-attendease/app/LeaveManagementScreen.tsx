import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  Modal,
  Dimensions,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLeave } from '../lib/useLeave';
import { useUserProfile } from '../lib/useUserProfile';
import { supabase } from '../lib/supabase';
import { APP_NAME } from '../branding';
import { ScreenWrapper } from '../src/components/ScreenWrapper';

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name?: string;
  leave_type_id: string;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  admin_comments?: string;
  created_at: string;
  updated_at: string;
}

interface LeaveType {
  id: string;
  name: string;
  max_days_per_year: number;
}

interface LeaveBalance {
  leave_type_id: string;
  leave_type_name?: string;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
}

export default function LeaveManagementScreen({ navigation }: any) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'balances' | 'calendar' | 'backdated'>('requests');
  const { profileData } = useUserProfile();
  const { getLeaveRequests, approveLeaveRequest, rejectLeaveRequest } = useLeave();

  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Backdated leave states
  const [showBackdatedForm, setShowBackdatedForm] = useState(false);
  const [backdatedForm, setBackdatedForm] = useState({
    leaveTypeId: '',
    date: '',
    reason: ''
  });

  const loadLeaveRequests = async () => {
    try {
      if (!profileData?.profile?.company_id) {
        console.log('No company ID available for leave requests');
        return;
      }
      
      setLoading(true);
      // First get leave requests without profiles to avoid column issues
      const { data: leaveData, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types(name)
        `)
        .eq('company_id', profileData.profile.company_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Then get employee names separately
      const employeeIds = [...new Set(leaveData?.map(req => req.employee_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, name, email')
        .in('id', employeeIds);
      
      // Create a map of employee names
      const employeeMap = new Map();
      profilesData?.forEach(profile => {
        const displayName = profile.full_name || profile.name || profile.email || 'Unknown Employee';
        employeeMap.set(profile.id, displayName);
      });
      
      // Format the data to include employee names
      const formattedData = (leaveData || []).map(request => ({
        ...request,
        employee_name: employeeMap.get(request.employee_id) || 'Unknown Employee',
        leave_type_name: request.leave_types?.name || 'Unknown Leave Type'
      }));
      
      setLeaveRequests(formattedData);
    } catch (error) {
      console.error('Error loading leave requests:', error);
      Alert.alert('Error', 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveTypes = async () => {
    try {
      if (!profileData?.profile?.company_id) {
        console.log('No company ID available');
        return;
      }
      
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true)
        .eq('company_id', profileData.profile.company_id);
      if (error) throw error;
      setLeaveTypes(data || []);
    } catch (error) {
      console.error('Error loading leave types:', error);
    }
  };

  const loadLeaveBalances = async () => {
    try {
      if (!profileData?.profile?.id) return;
      
      const { data, error } = await supabase
        .from('leave_balances')
        .select(`
          *,
          leave_types(name)
        `)
        .eq('employee_id', profileData.profile.id)
        .eq('company_id', profileData?.profile?.company_id);
      
      if (error) throw error;
      setLeaveBalances(data || []);
    } catch (error) {
      console.error('Error loading leave balances:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadLeaveRequests(),
      loadLeaveTypes(),
      loadLeaveBalances()
    ]);
    setRefreshing(false);
  };

  const handleSubmitLeaveRequest = async () => {
    try {
      if (!formData.leaveTypeId || !formData.startDate || !formData.endDate || !formData.reason) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      if (!profileData?.profile?.id || !profileData?.profile?.company_id) {
        Alert.alert('Error', 'User profile not found');
        return;
      }

      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { error } = await supabase.from('leave_requests').insert({
        employee_id: profileData.profile.id,
        company_id: profileData.profile.company_id,
        leave_type_id: formData.leaveTypeId,
        start_date: formData.startDate,
        end_date: formData.endDate,
        total_days: totalDays,
        reason: formData.reason,
        status: profileData.profile.role === 'super_admin' ? 'approved' : 'pending'
      });

      if (error) throw error;

      Alert.alert('Success', 'Leave request submitted successfully');
      setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      setShowRequestForm(false);
      loadLeaveRequests();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      Alert.alert('Error', 'Failed to submit leave request');
    }
  };

  const handleApproveLeave = async (requestId: string) => {
    try {
      if (!profileData?.profile?.id) {
        Alert.alert('Error', 'User profile not found');
        return;
      }

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: profileData.profile.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('company_id', profileData.profile.company_id);

      if (error) throw error;
      Alert.alert('Success', 'Leave request approved');
      loadLeaveRequests();
    } catch (error) {
      console.error('Error approving leave request:', error);
      Alert.alert('Error', 'Failed to approve leave request');
    }
  };

  const handleRejectLeave = async (requestId: string) => {
    try {
      if (!profileData?.profile?.id) {
        Alert.alert('Error', 'User profile not found');
        return;
      }

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: profileData.profile.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('company_id', profileData.profile.company_id);

      if (error) throw error;
      Alert.alert('Success', 'Leave request rejected');
      loadLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      Alert.alert('Error', 'Failed to reject leave request');
    }
  };

  useEffect(() => {
    if (profileData?.profile?.company_id) {
      onRefresh();
    }
  }, [profileData]);

  // Determine role
  const userRole = profileData?.profile?.role;
  const isAdminOrManager = userRole === 'admin' || userRole === 'super_admin' || userRole === 'reporting_manager';
  const isEmployee = userRole === 'employee';

  // Filter requests based on role
  const filteredRequests = leaveRequests.filter(request => {
    if (isEmployee) {
      return request.employee_id === profileData?.profile?.id;
    }
    return true; // Admin/Manager sees all
  }).filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  // Helper: status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return { color: '#f59e0b', label: 'Pending' };
      case 'approved': return { color: '#10b981', label: 'Approved' };
      case 'rejected': return { color: '#ef4444', label: 'Rejected' };
      default: return { color: '#e5e7eb', label: 'Unknown' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      if (showStartDatePicker) {
        setFormData({ ...formData, startDate: date.toISOString().split('T')[0] });
        setShowStartDatePicker(false);
      } else if (showEndDatePicker) {
        setFormData({ ...formData, endDate: date.toISOString().split('T')[0] });
        setShowEndDatePicker(false);
      } else if (showDatePicker) {
        setBackdatedForm({ ...backdatedForm, date: date.toISOString().split('T')[0] });
        setShowDatePicker(false);
      }
    } else {
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
      setShowDatePicker(false);
    }
  };

  const handleBackdatedSubmit = async () => {
    try {
      if (!backdatedForm.leaveTypeId || !backdatedForm.date || !backdatedForm.reason) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      if (!profileData?.profile?.id || !profileData?.profile?.company_id) {
        Alert.alert('Error', 'User profile not found');
        return;
      }

      const { error } = await supabase.from('leave_requests').insert({
        employee_id: profileData.profile.id,
        company_id: profileData.profile.company_id,
        leave_type_id: backdatedForm.leaveTypeId,
        start_date: backdatedForm.date,
        end_date: backdatedForm.date,
        total_days: 1,
        reason: backdatedForm.reason,
        status: 'pending'
      });

      if (error) throw error;

      Alert.alert('Success', 'Backdated leave request submitted successfully');
      setBackdatedForm({ leaveTypeId: '', date: '', reason: '' });
      setShowBackdatedForm(false);
      loadLeaveRequests();
    } catch (error) {
      console.error('Error submitting backdated leave request:', error);
      Alert.alert('Error', 'Failed to submit backdated leave request');
    }
  };

  const getLeaveRequestsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredRequests.filter(request => 
      request.start_date <= dateStr && request.end_date >= dateStr
    );
  };

  // Get summary stats
  const totalRequests = filteredRequests.length;
  const pendingRequests = filteredRequests.filter(r => r.status === 'pending').length;
  const approvedRequests = filteredRequests.filter(r => r.status === 'approved').length;
  const rejectedRequests = filteredRequests.filter(r => r.status === 'rejected').length;

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Leave Management</Text>
          {isEmployee && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowRequestForm(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Request Leave</Text>
            </TouchableOpacity>
          )}
        </View>

      {/* Dashboard Overview */}
      {isAdminOrManager && (
        <View style={styles.dashboardContainer}>
          <Text style={styles.dashboardTitle}>Leave Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="document-text" size={24} color="#3b82f6" />
              <Text style={styles.statNumber}>{totalRequests}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color="#f59e0b" />
              <Text style={styles.statNumber}>{pendingRequests}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.statNumber}>{approvedRequests}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
              <Text style={styles.statNumber}>{rejectedRequests}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
          ].map((filterOption) => (
            <TouchableOpacity
              key={filterOption.key}
              style={[
                styles.filterButton,
                filter === filterOption.key && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(filterOption.key as any)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === filterOption.key && styles.filterButtonTextActive,
                ]}
              >
                {filterOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            {filteredRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.employeeName}>
                    {request.employee_name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(request.status).color }]}>
                    <Text style={styles.statusText}>{getStatusBadge(request.status).label}</Text>
                  </View>
                </View>

                <Text style={styles.leaveType}>
                  {request.leave_type_name}
                </Text>

                <Text style={styles.dateRange}>
                  {formatDate(request.start_date)} - {formatDate(request.end_date)}
                  <Text style={styles.daysText}> ({request.total_days} days)</Text>
                </Text>

                <Text style={styles.reason}>{request.reason}</Text>

                {isAdminOrManager && request.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApproveLeave(request.id)}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRejectLeave(request.id)}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
      {/* Leave Request Form Modal */}
      <Modal
        visible={showRequestForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequestForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Leave</Text>
              <TouchableOpacity onPress={() => setShowRequestForm(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Leave Type</Text>
                <View style={styles.selectContainer}>
                  {leaveTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.selectOption,
                        formData.leaveTypeId === type.id && styles.selectedOption
                      ]}
                      onPress={() => setFormData({ ...formData, leaveTypeId: type.id })}
                    >
                      <Text style={[
                        styles.selectOptionText,
                        formData.leaveTypeId === type.id && styles.selectedOptionText
                      ]}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={formData.startDate ? styles.dateInputText : styles.dateInputPlaceholder}>
                    {formData.startDate || 'Select start date'}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={formData.endDate ? styles.dateInputText : styles.dateInputPlaceholder}>
                    {formData.endDate || 'Select end date'}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {formData.startDate && formData.endDate && (
                <View style={styles.daysInfo}>
                  <Text style={styles.daysInfoText}>
                    Total Days: {calculateDays(formData.startDate, formData.endDate)}
                  </Text>
                </View>
              )}

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Reason</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.reason}
                  onChangeText={(text) => setFormData({ ...formData, reason: text })}
                  placeholder="Enter reason for leave"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowRequestForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmitLeaveRequest}
                >
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Backdated Leave Form Modal */}
      <Modal
        visible={showBackdatedForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBackdatedForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Backdated Leave Request</Text>
              <TouchableOpacity onPress={() => setShowBackdatedForm(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Leave Type</Text>
                <View style={styles.selectContainer}>
                  {leaveTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.selectOption,
                        backdatedForm.leaveTypeId === type.id && styles.selectedOption
                      ]}
                      onPress={() => setBackdatedForm({ ...backdatedForm, leaveTypeId: type.id })}
                    >
                      <Text style={[
                        styles.selectOptionText,
                        backdatedForm.leaveTypeId === type.id && styles.selectedOptionText
                      ]}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={backdatedForm.date ? styles.dateInputText : styles.dateInputPlaceholder}>
                    {backdatedForm.date || 'Select date'}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Reason</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={backdatedForm.reason}
                  onChangeText={(text) => setBackdatedForm({ ...backdatedForm, reason: text })}
                  placeholder="Enter reason for backdated leave"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowBackdatedForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleBackdatedSubmit}
                >
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
        
        {showEndDatePicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={formData.startDate ? new Date(formData.startDate) : new Date()}
          />
        )}
        
        {showDatePicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    color: '#64748b',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  // Dashboard styles
  dashboardContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 8,
  },
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  leaveType: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  daysText: {
    color: '#64748b',
  },
  reason: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  balanceCard: {
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
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  remainingDays: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  balanceProgress: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  balanceText: {
    fontSize: 12,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  formContainer: {
    padding: 16,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedOption: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  selectOptionText: {
    color: '#64748b',
    fontSize: 14,
  },
  selectedOptionText: {
    color: '#fff',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  daysInfo: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  daysInfoText: {
    color: '#0369a1',
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Calendar styles
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayHeader: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  calendarToday: {
    backgroundColor: '#3b82f6',
  },
  calendarHasLeave: {
    backgroundColor: '#fef3c7',
  },
  calendarDayText: {
    fontSize: 14,
    color: '#1e293b',
  },
  calendarTodayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  calendarHasLeaveText: {
    color: '#92400e',
    fontWeight: '600',
  },
  calendarLeaveIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f59e0b',
  },
  // Backdated styles
  backdatedContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  backdatedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    marginBottom: 12,
  },
  backdatedButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  backdatedInfo: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  // Date input styles
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateInputText: {
    fontSize: 16,
    color: '#1e293b',
  },
  dateInputPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
})