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
import { useUserProfile } from '../lib/useUserProfile';
import { supabase } from '../lib/supabase';

interface Team {
  id: string;
  name: string;
  description: string;
  manager_name: string;
  member_count: number;
  created_at: string;
}

interface TeamMember {
  id: string;
  employee_id: string;
  name: string;
  position: string;
  email: string;
  role: string;
}

export default function TeamManagementScreen({ navigation }: any) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { profileData } = useUserProfile();

  const loadTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('*');
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      Alert.alert('Error', 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('team_id', teamId);
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      Alert.alert('Error', 'Failed to load team members');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTeams();
    if (selectedTeam) {
      await loadTeamMembers(selectedTeam.id);
    }
    setRefreshing(false);
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    loadTeamMembers(team.id);
  };

  const handleCreateTeam = async (teamName: string, description: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('teams')
        .insert([{ name: teamName, description }]);
      if (error) throw error;
      Alert.alert('Success', 'Team created successfully');
      loadTeams();
    } catch (error) {
      Alert.alert('Error', 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeam = async (teamId: string, updates: any) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId);
      if (error) throw error;
      Alert.alert('Success', 'Team updated successfully');
      loadTeams();
    } catch (error) {
      Alert.alert('Error', 'Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    Alert.alert(
      'Delete Team',
      `Are you sure you want to delete the team "${team.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', team.id);
              if (error) throw error;
              Alert.alert('Success', 'Team deleted successfully');
              loadTeams();
              if (selectedTeam?.id === team.id) {
                setSelectedTeam(null);
                setTeamMembers([]);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete team');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddMember = async (teamId: string, employeeId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('employees')
        .update({ team_id: teamId })
        .eq('id', employeeId);
      if (error) throw error;
      Alert.alert('Success', 'Member added to team');
      loadTeamMembers(teamId);
    } catch (error) {
      Alert.alert('Error', 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.name} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('employees')
                .update({ team_id: null })
                .eq('id', member.id);
              if (error) throw error;
              Alert.alert('Success', 'Member removed successfully');
              if (selectedTeam) {
                loadTeamMembers(selectedTeam.id);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const canManageTeams = profileData?.profile?.role === 'admin' || profileData?.profile?.role === 'super_admin';

  if (!canManageTeams) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>You don't have permission to manage teams.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Team Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert('Create Team', 'Enter team name and description')}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.teamsSection}>
          <Text style={styles.sectionTitle}>Teams</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.teamsScrollView}
          >
            {teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={[
                  styles.teamCard,
                  selectedTeam?.id === team.id && styles.teamCardSelected,
                ]}
                onPress={() => handleTeamSelect(team)}
              >
                <View style={styles.teamCardHeader}>
                  <Text style={styles.teamName}>{team.name}</Text>
                  <View style={styles.teamActions}>
                    <TouchableOpacity
                      style={styles.teamActionButton}
                      onPress={() => Alert.alert('Edit Team', `Enter new name and description for "${team.name}"`)}
                    >
                      <Ionicons name="pencil" size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.teamActionButton}
                      onPress={() => handleDeleteTeam(team)}
                    >
                      <Ionicons name="trash" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.teamDescription} numberOfLines={2}>
                  {team.description}
                </Text>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamManager}>Manager: {team.manager_name}</Text>
                  <Text style={styles.teamMembers}>{team.member_count} members</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedTeam && (
          <View style={styles.membersSection}>
            <View style={styles.membersHeader}>
              <Text style={styles.sectionTitle}>
                {selectedTeam.name} - Members
              </Text>
              <TouchableOpacity style={styles.addMemberButton} onPress={() => Alert.alert('Add Member', 'Enter employee ID to add')}>
                <Ionicons name="person-add" size={20} color="#3b82f6" />
                <Text style={styles.addMemberButtonText}>Add Member</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView
              style={styles.membersScrollView}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {teamMembers.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberPosition}>{member.position}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                    <View style={styles.memberRole}>
                      <View
                        style={[
                          styles.roleBadge,
                          {
                            backgroundColor:
                              member.role === 'manager' ? '#3b82f6' : '#64748b',
                          },
                        ]}
                      >
                        <Text style={styles.roleText}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {member.role !== 'manager' && (
                    <TouchableOpacity
                      style={styles.removeMemberButton}
                      onPress={() => handleRemoveMember(member)}
                    >
                      <Ionicons name="person-remove" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {!selectedTeam && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>Select a team to view members</Text>
          </View>
        )}
      </View>
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
  content: {
    flex: 1,
  },
  teamsSection: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  teamsScrollView: {
    flexDirection: 'row',
  },
  teamCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 200,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  teamCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  teamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  teamActions: {
    flexDirection: 'row',
    gap: 4,
  },
  teamActionButton: {
    padding: 4,
  },
  teamDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  teamInfo: {
    gap: 2,
  },
  teamManager: {
    fontSize: 12,
    color: '#64748b',
  },
  teamMembers: {
    fontSize: 12,
    color: '#64748b',
  },
  membersSection: {
    flex: 1,
    padding: 16,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addMemberButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  membersScrollView: {
    flex: 1,
  },
  memberCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  memberPosition: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  memberRole: {
    flexDirection: 'row',
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
  removeMemberButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    padding: 20,
  },
}); 