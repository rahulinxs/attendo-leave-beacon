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
import { useEmployees } from '../lib/useEmployees';
import { useUserProfile } from '../lib/useUserProfile';

interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department: string;
  status: string;
  joining_date: string;
}

export default function EmployeeManagementScreen({ navigation }: any) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userProfile } = useUserProfile();
  const { getEmployees, deleteEmployee } = useEmployees();

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  };

  const handleDeleteEmployee = (employeeId: string, employeeName: string) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employeeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmployee(employeeId);
              Alert.alert('Success', 'Employee deleted successfully');
              loadEmployees();
            } catch (error) {
              console.error('Error deleting employee:', error);
              Alert.alert('Error', 'Failed to delete employee');
            }
          },
        },
      ]
    );
  };

  const handleEditEmployee = (employee: Employee) => {
    // Navigate to edit employee screen (to be implemented)
    Alert.alert('Edit Employee', 'Edit functionality coming soon');
  };

  const handleAddEmployee = () => {
    // Navigate to add employee screen (to be implemented)
    Alert.alert('Add Employee', 'Add employee functionality coming soon');
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const canManageEmployees = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  if (!canManageEmployees) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>You don't have permission to manage employees.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Employee Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddEmployee}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : employees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        ) : (
          employees.map((employee) => (
            <View key={employee.id} style={styles.employeeCard}>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>
                  {employee.first_name} {employee.last_name}
                </Text>
                <Text style={styles.employeeId}>ID: {employee.employee_id}</Text>
                <Text style={styles.employeeEmail}>{employee.email}</Text>
                <Text style={styles.employeePosition}>
                  {employee.position} • {employee.department}
                </Text>
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          employee.status === 'active' ? '#10b981' : '#ef4444',
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEditEmployee(employee)}
                >
                  <Ionicons name="pencil" size={16} color="#3b82f6" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteEmployee(employee.id, `${employee.first_name} ${employee.last_name}`)}
                >
                  <Ionicons name="trash" size={16} color="#ef4444" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
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
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 8,
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
  employeeCard: {
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
  employeeInfo: {
    marginBottom: 12,
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
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  editButton: {
    backgroundColor: '#eff6ff',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
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