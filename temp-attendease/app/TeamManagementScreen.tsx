import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';
import { APP_NAME } from '../branding';
import { ScreenWrapper } from 'src/components/ScreenWrapper';

interface Team {
  id: string;
  name: string;
  description: string;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  member_count?: number;
}

interface TeamMember {
  id: string;
  full_name: string;
  name?: string;
  email: string;
  role: string;
  department: string;
  position: string;
  team_id: string | null;
  reporting_manager_id: string;
  created_at: string;
  is_active: boolean;
}

const TeamManagementScreen = () => {
  const { profileData } = useUserProfile();
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState<'teams' | 'unassigned'>('teams');
  const [teamStats, setTeamStats] = useState({ totalTeams: 0, totalEmployees: 0, unassigned: 0 });

  useEffect(() => {
    if (profileData?.profile?.company_id) {
      fetchTeams();
      fetchEmployees();
    }
  }, [profileData]);

  const fetchTeams = async () => {
    if (!profileData?.profile?.company_id) {
      console.log('No company ID available for teams');
      return;
    }

    try {
      const companyId = profileData.profile.company_id;

      // Get teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (teamsError) throw teamsError;

      // Get manager profiles for teams that have managers
      const managerIds = teamsData
        ?.filter(team => team.manager_id)
        .map(team => team.manager_id)
        .filter(Boolean) || [];

      let managerProfiles = [];
      if (managerIds.length > 0) {
        const { data: managerData, error: managerError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', managerIds);

        if (!managerError) {
          managerProfiles = managerData || [];
        }
      }

      // Combine teams with manager data
      const teamsWithManagers = teamsData?.map(team => ({
        ...team,
        manager: managerProfiles.find(manager => manager.id === team.manager_id) || null
      })) || [];

      setTeams(teamsWithManagers);
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      setError(err.message);
    }
  };

  const fetchEmployees = async () => {
    if (!profileData?.profile?.company_id) {
      console.log('No company ID available for employees');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const companyId = profileData.profile.company_id;

      // Get all employees
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('id, name, email, role, department, position, team_id, reporting_manager_id, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      
      // Format data
      const formattedData = (data || []).map(emp => ({
        ...emp,
        full_name: emp.name || emp.email || 'Unknown User',
        position: emp.position || emp.role || 'Employee'
      }));
      
      setEmployees(formattedData);
      
      // Calculate stats
      const unassignedCount = formattedData.filter(emp => !emp.team_id).length;
      
      setTeamStats({
        totalTeams: teams.length,
        totalEmployees: formattedData.length,
        unassigned: unassignedCount
      });
      
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeams();
    fetchEmployees();
  };

  const getTeamMembers = (teamId: string) => {
    return employees.filter(emp => emp.team_id === teamId);
  };

  const getUnassignedEmployees = () => {
    return employees.filter(emp => !emp.team_id);
  };

  const getFilteredTeams = () => {
    return teams.filter(team =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.manager?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };
  
  const filteredTeams = getFilteredTeams();
  const unassignedEmployees = getUnassignedEmployees();


  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return '#dc2626';
      case 'admin': return '#ea580c';
      case 'reporting_manager': return '#2563eb';
      case 'employee': return '#059669';
      default: return '#64748b';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return 'shield';
      case 'admin': return 'key';
      case 'reporting_manager': return 'people';
      case 'employee': return 'person';
      default: return 'person-outline';
    }
  };

  const renderTeamItem = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => setSelectedTeam(item)}
    >
      <View style={styles.teamHeader}>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{item.name}</Text>
          <Text style={styles.teamDescription}>{item.description || 'No description'}</Text>
        </View>
        <View style={styles.teamMemberCount}>
          <Ionicons name="people" size={16} color="#2563eb" />
          <Text style={styles.memberCountText}>{getTeamMembers(item.id).length}</Text>
        </View>
      </View>
      <View style={styles.teamDetails}>
        <Text style={styles.teamManager}>
          Manager: {item.manager?.name || 'Not assigned'}
        </Text>
        <Text style={styles.teamDate}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderUnassignedItem = ({ item }: { item: TeamMember }) => (
    <View style={styles.unassignedCard}>
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.full_name}</Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
          <Text style={styles.memberDepartment}>{item.department} • {item.position}</Text>
        </View>
        <View style={styles.unassignedBadge}>
          <Ionicons name="warning" size={16} color="#ea580c" />
          <Text style={styles.unassignedText}>Unassigned</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading team members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#dc2626" />
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTeamMembers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}> Team Management</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={20} color="#2563eb" />
            <Text style={styles.statNumber}>{teamStats.totalTeams}</Text>
            <Text style={styles.statLabel}>Teams</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="person" size={20} color="#059669" />
            <Text style={styles.statNumber}>{teamStats.totalEmployees}</Text>
            <Text style={styles.statLabel}>Employees</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="person-add" size={20} color="#ea580c" />
            <Text style={styles.statNumber}>{teamStats.unassigned}</Text>
            <Text style={styles.statLabel}>Unassigned</Text>
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search team members..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {(profileData?.profile?.role === 'reporting_manager' || 
          profileData?.profile?.role === 'admin' || 
          profileData?.profile?.role === 'super_admin') && (
          <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'teams' && styles.activeTab]}
            onPress={() => setActiveTab('teams')}
          >
            <Ionicons name="people" size={16} color={activeTab === 'teams' ? '#fff' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'teams' && styles.activeTabText]}>Teams</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'unassigned' && styles.activeTab]}
            onPress={() => setActiveTab('unassigned')}
          >
            <Ionicons name="person-add" size={16} color={activeTab === 'unassigned' ? '#fff' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'unassigned' && styles.activeTabText]}>Unassigned</Text>
          </TouchableOpacity>
        </View>
        )}
      </View>

      {activeTab === 'teams' && (
        <FlatList
          data={filteredTeams}
          keyExtractor={(item) => item.id}
          renderItem={renderTeamItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No teams match your search' : 'No teams found'}
              </Text>
            </View>
          }
        />
      )}

      {/* Team Details Modal */}
      <Modal
        visible={!!selectedTeam}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedTeam(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Team Details</Text>
              <TouchableOpacity onPress={() => setSelectedTeam(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {selectedTeam && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Team Name</Text>
                  <Text style={styles.detailValue}>{selectedTeam.name}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedTeam.description || 'No description'}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Manager</Text>
                  <Text style={styles.detailValue}>{selectedTeam.manager?.name || 'Not assigned'}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Team Members ({getTeamMembers(selectedTeam.id).length})</Text>
                  <View style={styles.teamMembersList}>
                    {getTeamMembers(selectedTeam.id).map(member => (
                      <View key={member.id} style={styles.teamMemberItem}>
                        <Text style={styles.teamMemberName}>{member.full_name}</Text>
                        <Text style={styles.teamMemberRole}>{member.position}</Text>
                      </View>
                    ))}
                    {getTeamMembers(selectedTeam.id).length === 0 && (
                      <Text style={styles.noMembersText}>No members assigned</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Created Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedTeam.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {activeTab === 'unassigned' && (
        <FlatList
          data={unassignedEmployees.filter(emp =>
            emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          keyExtractor={(item) => item.id}
          renderItem={renderUnassignedItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#059669" />
              <Text style={styles.emptyText}>
                All employees are assigned to teams
              </Text>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Team card styles
  teamCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  teamDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  teamMemberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 4,
  },
  teamDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  teamManager: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  teamDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  // Unassigned card styles
  unassignedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderLeftWidth: 4,
    borderLeftColor: '#ea580c',
  },
  unassignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unassignedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ea580c',
    marginLeft: 4,
  },
  // Team members list in modal
  teamMembersList: {
    marginTop: 8,
  },
  teamMemberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 4,
  },
  teamMemberName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  teamMemberRole: {
    fontSize: 12,
    color: '#64748b',
  },
  noMembersText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 36,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  controls: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '500',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  memberDepartment: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  memberDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalBody: {
    padding: 20,
  },
  detailItem: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#1e293b',
  },
});

export default TeamManagementScreen;
