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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmployees } from '../lib/useEmployees';
import { useUserProfile } from '../lib/useUserProfile';
import { supabase } from '../lib/supabase';

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
}

export default function EmployeeManagementScreen({ navigation }: any) {
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
  const [teams, setTeams] = useState([]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*');
      if (error) throw error;
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
    Alert.prompt('Edit Employee', 'Enter new name', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async (name) => {
          if (name) {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('employees')
                .update({ name })
                .eq('id', employee.id);
              if (error) throw error;
              Alert.alert('Success', 'Employee updated successfully');
              loadEmployees();
            } catch (error) {
              Alert.alert('Error', 'Failed to update employee');
            } finally {
              setLoading(false);
            }
          }
        },
      },
    ]);
  };

  // Updated add employee handler
  const handleAddEmployee = () => {
    setShowAddModal(true);
  };

  const handleSubmitAddEmployee = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.from('employees').insert([
        {
          name: newEmployee.name,
          email: newEmployee.email,
          role: newEmployee.role,
          department: newEmployee.department,
          team_id: newEmployee.team_id || null,
          company_id: profileData.profile.company_id, // Always set company_id
        },
      ]);
      if (error) throw error;
      Alert.alert('Success', 'Employee added successfully');
      setShowAddModal(false);
      setNewEmployee({ name: '', email: '', role: 'employee', department: '', team_id: '' });
      loadEmployees();
    } catch (error) {
      Alert.alert('Error', 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  // Fetch teams for the current company
  useEffect(() => {
    if (profileData?.profile?.company_id) {
      supabase
        .from('teams')
        .select('id, name')
        .eq('company_id', profileData.profile.company_id)
        .then(({ data }) => setTeams(data || []));
    }
  }, [profileData?.profile?.company_id]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const canManageEmployees = profileData?.profile?.role === 'admin' || profileData?.profile?.role === 'super_admin';

  if (!canManageEmployees) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>You don't have permission to manage employees.</Text>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
                <Text style={styles.employeeName}>{employee.name}</Text>
                <Text style={styles.employeeEmail}>{employee.email}</Text>
                <Text style={styles.employeePosition}>
                  {employee.position} • {employee.department}
                </Text>
                <Text style={styles.employeeHireDate}>
                  Hired: {formatDate(employee.hire_date)}
                </Text>
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: employee.is_active ? '#10b981' : '#ef4444',
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor:
                          employee.role === 'admin' ? '#3b82f6' :
                          employee.role === 'super_admin' ? '#ef4444' : '#64748b',
                      },
                    ]}
                  >
                    <Text style={styles.roleText}>
                      {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
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
                  onPress={() => handleDeleteEmployee(employee.id, employee.name)}
                >
                  <Ionicons name="trash" size={16} color="#ef4444" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      {/* Add Employee Modal */}
      {showAddModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0008', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Add Employee</Text>
            <TextInput placeholder="Name" value={newEmployee.name} onChangeText={v => setNewEmployee(e => ({ ...e, name: v }))} style={{ borderWidth: 1, marginBottom: 8, padding: 8 }} />
            <TextInput placeholder="Email" value={newEmployee.email} onChangeText={v => setNewEmployee(e => ({ ...e, email: v }))} style={{ borderWidth: 1, marginBottom: 8, padding: 8 }} />
            <TextInput placeholder="Department" value={newEmployee.department} onChangeText={v => setNewEmployee(e => ({ ...e, department: v }))} style={{ borderWidth: 1, marginBottom: 8, padding: 8 }} />
            <Text style={{ marginBottom: 4 }}>Team</Text>
            <ScrollView horizontal style={{ marginBottom: 8 }}>
              {teams.map(team => (
                <TouchableOpacity key={team.id} onPress={() => setNewEmployee(e => ({ ...e, team_id: team.id }))} style={{ padding: 8, backgroundColor: newEmployee.team_id === team.id ? '#3b82f6' : '#eee', borderRadius: 6, marginRight: 8 }}>
                  <Text style={{ color: newEmployee.team_id === team.id ? 'white' : '#333' }}>{team.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ padding: 10 }}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitAddEmployee} style={{ backgroundColor: '#3b82f6', padding: 10, borderRadius: 6 }}><Text style={{ color: 'white' }}>Add</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  employeeEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  employeeHireDate: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
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