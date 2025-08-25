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

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  reporting_manager_id: string;
  created_at: string;
  is_active: boolean;
}

interface Department {
  name: string;
  members: TeamMember[];
  count: number;
}

const TeamsScreen = () => {
  const { profileData } = useUserProfile();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'departments'>('departments');

  useEffect(() => {
    fetchTeamData();
  }, [profileData]);

  const fetchTeamData = async () => {
    if (!profileData?.profile) return;

    setLoading(true);
    setError(null);

    try {
      const userId = profileData.profile.id;
      const userRole = profileData.profile.role;
      const companyId = profileData.profile.company_id;

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      // Filter based on user role
      if (userRole === 'reporting_manager') {
        // Managers see their direct reports + themselves
        query = query.or(`reporting_manager_id.eq.${userId},id.eq.${userId}`);
      } else if (userRole === 'admin' || userRole === 'super_admin') {
        // Admins see all company members
        // No additional filtering needed
      } else {
        // Regular employees see all team members (for collaboration)
        // No additional filtering needed
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      const members = data || [];
      setTeamMembers(members);
      
      // Group by departments
      const deptMap = new Map<string, TeamMember[]>();
      members.forEach(member => {
        const dept = member.department || 'Unassigned';
        if (!deptMap.has(dept)) {
          deptMap.set(dept, []);
        }
        deptMap.get(dept)!.push(member);
      });

      const deptArray: Department[] = Array.from(deptMap.entries()).map(([name, members]) => ({
        name,
        members,
        count: members.length,
      })).sort((a, b) => b.count - a.count);

      setDepartments(deptArray);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeamData();
  };

  const filteredMembers = teamMembers.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDepartments = departments.map(dept => ({
    ...dept,
    members: dept.members.filter(member =>
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(dept => dept.members.length > 0);

  const handleMemberPress = (member: TeamMember) => {
    setSelectedMember(member);
  };

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

  const renderMemberItem = ({ item }: { item: TeamMember }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => handleMemberPress(item)}
    >
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.full_name}</Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
          {item.department && (
            <Text style={styles.memberDepartment}>{item.department}</Text>
          )}
        </View>
        <View style={styles.memberActions}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Ionicons 
              name={getRoleIcon(item.role) as any} 
              size={12} 
              color="#fff" 
              style={{ marginRight: 4 }} 
            />
            <Text style={styles.roleText}>{item.role.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDepartmentSection = ({ item }: { item: Department }) => (
    <View style={styles.departmentSection}>
      <View style={styles.departmentHeader}>
        <Text style={styles.departmentName}>{item.name}</Text>
        <Text style={styles.departmentCount}>{item.count} member{item.count !== 1 ? 's' : ''}</Text>
      </View>
      {item.members.map((member) => (
        <TouchableOpacity
          key={member.id}
          style={styles.departmentMemberCard}
          onPress={() => handleMemberPress(member)}
        >
          <View style={styles.memberHeader}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.full_name}</Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) }]}>
              <Ionicons 
                name={getRoleIcon(member.role) as any} 
                size={10} 
                color="#fff" 
                style={{ marginRight: 4 }} 
              />
              <Text style={styles.roleText}>{member.role.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading team...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchTeamData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{APP_NAME} Teams</Text>
        <View style={styles.headerStats}>
          <Text style={styles.statsText}>
            {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} • {departments.length} department{departments.length !== 1 ? 's' : ''}
          </Text>
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

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'departments' && styles.toggleButtonActive]}
            onPress={() => setViewMode('departments')}
          >
            <Ionicons name="business" size={16} color={viewMode === 'departments' ? '#fff' : '#64748b'} />
            <Text style={[styles.toggleText, viewMode === 'departments' && styles.toggleTextActive]}>
              Departments
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : '#64748b'} />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              List
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={viewMode === 'departments' ? filteredDepartments : filteredMembers}
        keyExtractor={(item) => viewMode === 'departments' ? (item as Department).name : (item as TeamMember).id}
        renderItem={viewMode === 'departments' ? renderDepartmentSection : renderMemberItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No team members match your search' : 'No team members found'}
            </Text>
          </View>
        }
      />

      {/* Member Details Modal */}
      <Modal
        visible={!!selectedMember}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Team Member</Text>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {selectedMember && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{selectedMember.full_name}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedMember.email}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Role</Text>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(selectedMember.role) }]}>
                    <Ionicons 
                      name={getRoleIcon(selectedMember.role) as any} 
                      size={12} 
                      color="#fff" 
                      style={{ marginRight: 4 }} 
                    />
                    <Text style={styles.roleText}>
                      {selectedMember.role.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                {selectedMember.department && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Department</Text>
                    <Text style={styles.detailValue}>{selectedMember.department}</Text>
                  </View>
                )}
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Joined Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedMember.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </ScrollView>
            )}
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
    marginBottom: 4,
  },
  headerStats: {
    marginTop: 4,
  },
  statsText: {
    fontSize: 14,
    color: '#64748b',
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
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#2563eb',
  },
  toggleText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
  toggleTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
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
  departmentSection: {
    marginBottom: 24,
  },
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  departmentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  departmentCount: {
    fontSize: 14,
    color: '#64748b',
  },
  departmentMemberCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginBottom: 2,
  },
  memberDepartment: {
    fontSize: 12,
    color: '#94a3b8',
  },
  memberActions: {
    marginLeft: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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

export default TeamsScreen;
