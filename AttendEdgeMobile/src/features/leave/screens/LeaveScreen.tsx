import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';

const LeaveScreen = () => {
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  
  // Mock leave data
  const leaveRequests = {
    pending: [
      { id: '1', type: 'Sick Leave', date: '2023-06-10', days: 1, status: 'pending' },
      { id: '2', type: 'Casual Leave', date: '2023-06-15 to 2023-06-17', days: 3, status: 'pending' },
    ],
    approved: [
      { id: '3', type: 'Annual Leave', date: '2023-05-20 to 2023-05-25', days: 5, status: 'approved' },
    ],
    rejected: [
      { id: '4', type: 'Emergency Leave', date: '2023-05-05', days: 1, status: 'rejected' },
    ],
  };

  const leaveTypes = [
    { id: 'sick', name: 'Sick Leave', icon: 'medkit-outline', color: '#F59E0B' },
    { id: 'casual', name: 'Casual Leave', icon: 'sunny-outline', color: '#3B82F6' },
    { id: 'annual', name: 'Annual Leave', icon: 'calendar-outline', color: '#10B981' },
    { id: 'emergency', name: 'Emergency Leave', icon: 'warning-outline', color: '#EF4444' },
  ];

  const renderLeaveCard = (leave: any) => (
    <View key={leave.id} style={styles.leaveCard}>
      <View style={styles.leaveCardHeader}>
        <View style={styles.leaveTypeBadge}>
          <Ionicons 
            name={leaveTypes.find(lt => lt.name.includes(leave.type.split(' ')[0]))?.icon || 'document-text-outline'} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.leaveTypeText}>{leave.type}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          leave.status === 'approved' && styles.statusApproved,
          leave.status === 'rejected' && styles.statusRejected,
        ]}>
          <Text style={styles.statusText}>
            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.leaveCardBody}>
        <View style={styles.leaveInfo}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.leaveInfoText}>{leave.date}</Text>
        </View>
        <View style={styles.leaveInfo}>
          <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.leaveInfoText}>{leave.days} {leave.days > 1 ? 'days' : 'day'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leave Management</Text>
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={() => setShowApplyLeaveModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.applyButtonText}>Apply Leave</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.balanceContainer}
      >
        {leaveTypes.map((type) => (
          <View key={type.id} style={[styles.balanceCard, { backgroundColor: `${type.color}20` }]}>
            <View style={[styles.balanceIcon, { backgroundColor: type.color }]}>
              <Ionicons name={type.icon as any} size={20} color="#fff" />
            </View>
            <Text style={styles.balanceType}>{type.name}</Text>
            <Text style={styles.balanceValue}>12/15</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'pending' && styles.tabActive]}
          onPress={() => setSelectedTab('pending')}
        >
          <Text style={[styles.tabText, selectedTab === 'pending' && styles.tabTextActive]}>
            Pending
          </Text>
          {selectedTab === 'pending' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'approved' && styles.tabActive]}
          onPress={() => setSelectedTab('approved')}
        >
          <Text style={[styles.tabText, selectedTab === 'approved' && styles.tabTextActive]}>
            Approved
          </Text>
          {selectedTab === 'approved' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'rejected' && styles.tabActive]}
          onPress={() => setSelectedTab('rejected')}
        >
          <Text style={[styles.tabText, selectedTab === 'rejected' && styles.tabTextActive]}>
            Rejected
          </Text>
          {selectedTab === 'rejected' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.leaveList}>
        {leaveRequests[selectedTab].length > 0 ? (
          leaveRequests[selectedTab].map(renderLeaveCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyStateText}>No {selectedTab} leave requests</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showApplyLeaveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApplyLeaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setShowApplyLeaveModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Leave Type</Text>
              <View style={styles.leaveTypeContainer}>
                {leaveTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.leaveTypeOption,
                      { borderColor: type.color }
                    ]}
                  >
                    <Ionicons name={type.icon as any} size={20} color={type.color} />
                    <Text style={styles.leaveTypeOptionText}>
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  balanceContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  balanceCard: {
    width: 140,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
  },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  balanceType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
  },
  tab: {
    flex: 1,
    padding: theme.spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.primary,
  },
  leaveList: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  leaveCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  leaveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  leaveTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  leaveTypeText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  leaveCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  leaveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaveInfoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  leaveTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  leaveTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  leaveTypeOptionText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default LeaveScreen;
