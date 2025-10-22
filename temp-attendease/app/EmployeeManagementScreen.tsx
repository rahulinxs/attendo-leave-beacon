import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmployees } from '../lib/useEmployees';
import { useUserProfile } from '../lib/useUserProfile';
import { supabase } from '../lib/supabase';
import { ScreenWrapper } from '../src/components/ScreenWrapper';

interface Employee {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  position: string;
  hire_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company_id?: string;
}

interface Team {
  id: string;
  name: string;
  company_id: string;
}

export default function EmployeeManagementScreen({ navigation }: { navigation: any }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { profileData } = useUserProfile();
  const { getEmployees, deleteEmployee } = useEmployees();

  // New state for modal/form fields
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    role: 'employee',
    department: '',
    team_id: '',
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    departments: 0,
    admins: 0
  });

  const loadEmployees = async () => {
    try {
      setLoading(true);
      
      if (!profileData?.profile?.company_id) {
        console.warn('No company_id found for user');
        setEmployees([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, email, name, role, department, position, hire_date, 
          is_active, created_at, updated_at, company_id
        `)
        .eq('company_id', profileData.profile.company_id)
        .order('name', { ascending: true });
        
      if (error) throw error;
      setEmployees(data || []);
      
      // Calculate summary statistics
      const totalEmployees = data?.length || 0;
      const activeEmployees = data?.filter((emp: Employee) => emp.is_active).length || 0;
      const inactiveEmployees = totalEmployees - activeEmployees;
      const departments = new Set(data?.map((emp: Employee) => emp.department).filter(Boolean)).size;
      const admins = data?.filter((emp: Employee) => emp.role === 'admin' || emp.role === 'super_admin').length || 0;
      
      setSummary({
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        departments,
        admins
      });
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEmployees();
  };

  const handleAddEmployee = () => {
    setShowAddModal(true);
  };

  const handleSubmitAddEmployee = async () => {
    try {
      // TODO: Implement add employee logic
      setShowAddModal(false);
      loadEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      Alert.alert('Error', 'Failed to add employee');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await deleteEmployee(employeeId);
      loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      Alert.alert('Error', 'Failed to delete employee');
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [profileData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <Text>Loading employees...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Company Overview</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="people" size={24} color="#3b82f6" />
                </View>
                <Text style={styles.summaryNumber}>{summary.totalEmployees}</Text>
                <Text style={styles.summaryLabel}>Total Employees</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <Text style={styles.summaryNumber}>{summary.activeEmployees}</Text>
                <Text style={styles.summaryLabel}>Active</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="business" size={24} color="#8b5cf6" />
                </View>
                <Text style={styles.summaryNumber}>{summary.departments}</Text>
                <Text style={styles.summaryLabel}>Departments</Text>
              </View>
            </View>
          </View>

          <View style={styles.employeeList}>
            {employees.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyStateText}>No employees found</Text>
              </View>
            ) : (
              employees.map((employee) => (
                <View key={employee.id} style={styles.employeeItem}>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{employee.name}</Text>
                    <Text style={styles.employeeEmail}>{employee.email}</Text>
                    <Text style={styles.employeeDepartment}>
                      {employee.department || 'No department'}
                    </Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => {
                        // TODO: Implement edit functionality
                      }}
                    >
                      <Ionicons name="pencil" size={20} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteEmployee(employee.id)}
                    >
                      <Ionicons name="trash" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Add Employee Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Employee</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={newEmployee.name}
                onChangeText={(text) => setNewEmployee({...newEmployee, name: text})}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmployee.email}
                onChangeText={(text) => setNewEmployee({...newEmployee, email: text})}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Department"
                value={newEmployee.department}
                onChangeText={(text) => setNewEmployee({...newEmployee, department: text})}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmitAddEmployee}
                  disabled={!newEmployee.name || !newEmployee.email}
                >
                  <Text style={styles.submitButtonText}>Add Employee</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    width: '32%',
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  employeeList: {
    padding: 16,
    paddingBottom: 32,
  },
  employeeItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  employeeDepartment: {
    fontSize: 14,
    color: '#94a3b8',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  editButton: {
    marginLeft: 12,
    padding: 8,
  },
  deleteButton: {
    marginLeft: 4,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '500',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    marginTop: 8,
    textAlign: 'center',
  },
});
