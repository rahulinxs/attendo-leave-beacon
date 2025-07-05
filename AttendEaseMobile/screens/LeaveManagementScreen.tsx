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
import { useLeave } from '../lib/useLeave';
import { useUserProfile } from '../lib/useUserProfile';

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  days_requested: number;
  submitted_at: string;
}

export default function LeaveManagementScreen({ navigation }: any) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const { userProfile } = useUserProfile();
  const { getLeaveRequests, updateLeaveRequest } = useLeave();

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      // This would need to be implemented in the useLeave hook
      // For now, we'll use placeholder data
      const mockData: LeaveRequest[] = [
        {
          id: '1',
          employee_id: 'EMP001',
          employee_name: 'John Doe',
          leave_type: 'Annual Leave',
          start_date: '2024-01-15',
          end_date: '2024-01-17',
          reason: 'Family vacation',
          status: 'pending',
          days_requested: 3,
          submitted_at: '2024-01-10T10:00:00Z',
        },
        {
          id: '2',
          employee_id: 'EMP002',
          employee_name: 'Jane Smith',
          leave_type: 'Sick Leave',
          start_date: '2024-01-20',
          end_date: '2024-01-20',
          reason: 'Medical appointment',
          status: 'approved',
          days_requested: 1,
          submitted_at: '2024-01-18T14:30:00Z',
        },
        {
          id: '3',
          employee_id: 'EMP003',
          employee_name: 'Mike Johnson',
          leave_type: 'Personal Leave',
          start_date: '2024-01-25',
          end_date: '2024-01-26',
          reason: 'Personal matters',
          status: 'rejected',
          days_requested: 2,
          submitted_at: '2024-01-22T09:15:00Z',
        },
      ];
      setLeaveRequests(mockData);
    } catch (error) {
      console.error('Error loading leave requests:', error);
      Alert.alert('Error', 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaveRequests();
    setRefreshing(false);
  };

  const handleApproveLeave = (requestId: string, employeeName: string) => {
    Alert.alert(
      'Approve Leave Request',
      `Are you sure you want to approve ${employeeName}'s leave request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await updateLeaveRequest(requestId, { status: 'approved' });
              Alert.alert('Success', 'Leave request approved successfully');
              loadLeaveRequests();
            } catch (error) {
              console.error('Error approving leave request:', error);
              Alert.alert('Error', 'Failed to approve leave request');
            }
          },
        },
      ]
    );
  };

  const handleRejectLeave = (requestId: string, employeeName: string) => {
    Alert.alert(
      'Reject Leave Request',
      `Are you sure you want to reject ${employeeName}'s leave request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateLeaveRequest(requestId, { status: 'rejected' });
              Alert.alert('Success', 'Leave request rejected successfully');
              loadLeaveRequests();
            } catch (error) {
              console.error('Error rejecting leave request:', error);
              Alert.alert('Error', 'Failed to reject leave request');
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (request: LeaveRequest) => {
    Alert.alert(
      'Leave Request Details',
      `Employee: ${request.employee_name}\nLeave Type: ${request.leave_type}\nStart Date: ${request.start_date}\nEnd Date: ${request.end_date}\nDays: ${request.days_requested}\nReason: ${request.reason}\nStatus: ${request.status}`,
      [{ text: 'OK' }]
    );
  };

  useEffect(() => {
    loadLeaveRequests();
  }, []);

  const canManageLeave = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.role === 'reporting_manager';

  if (!canManageLeave) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>You don't have permission to manage leave requests.</Text>
      </View>
    );
  }

  const filteredRequests = leaveRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#64748b';
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leave Management</Text>
      </View>

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

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading leave requests...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No leave requests found</Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <View key={request.id} style={styles.leaveCard}>
              <View style={styles.leaveHeader}>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{request.employee_name}</Text>
                  <Text style={styles.employeeId}>ID: {request.employee_id}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(request.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.leaveDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Leave Type:</Text>
                  <Text style={styles.detailValue}>{request.leave_type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(request.start_date)} - {formatDate(request.end_date)} ({request.days_requested} days)
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reason:</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {request.reason}
                  </Text>
                </View>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={() => handleViewDetails(request)}
                >
                  <Ionicons name="eye" size={16} color="#64748b" />
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
                
                {request.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApproveLeave(request.id, request.employee_name)}
                    >
                      <Ionicons name="checkmark" size={16} color="#10b981" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRejectLeave(request.id, request.employee_name)}
                    >
                      <Ionicons name="close" size={16} color="#ef4444" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
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
  filterContainer: {
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: 'white',
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
  leaveCard: {
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
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  employeeInfo: {
    flex: 1,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  leaveDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  viewButton: {
    backgroundColor: '#f1f5f9',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  approveButton: {
    backgroundColor: '#ecfdf5',
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#fef2f2',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    padding: 20,
  },
}); 