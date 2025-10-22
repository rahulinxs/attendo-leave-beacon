import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Image,
  StatusBar,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import AppHeader from '../src/components/AppHeader';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  position: string;
  is_active: boolean;
  avatar_url?: string;
}

// Main component for the My Team screen
const MyTeamScreen = () => {
  const { profileData, loading: profileLoading, fetchUserProfile } = useUserProfile();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const profile = profileData?.profile;

    const fetchTeamData = async () => {
    if (!profile?.company_id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get the current user's team members
      const { data: teamData, error: teamError } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('full_name', { ascending: true });

      if (teamError) {
        console.error('Error fetching team members:', teamError);
        return;
      }
      
      setTeamMembers(teamData as TeamMember[] || []);
    } catch (error) {
      console.error('Error in fetchTeamData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (profile?.company_id) {
      fetchTeamData();
    } else if (!profileLoading) {
      fetchUserProfile().then(() => {
        if (profileData?.profile?.company_id) {
          fetchTeamData();
        }
      });
    }
  }, [profile?.company_id, profileLoading]);

  const onRefresh = () => {
    setRefreshing(true);
    if (profile?.company_id) {
      fetchTeamData();
    } else {
      fetchUserProfile().then(() => {
        if (profileData?.profile?.company_id) {
          fetchTeamData();
        } else {
          setRefreshing(false);
        }
      });
    }
  };

  const filteredMembers = teamMembers.filter(member => 
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.position && member.position.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderItem = ({ item }: { item: TeamMember }) => (
    <TouchableOpacity 
      style={styles.memberCard}
      onPress={() => {
        // Navigate to member details screen
      }}
    >
      <View style={styles.avatarContainer}>
        {item.avatar_url ? (
          <Image 
            source={{ uri: item.avatar_url }} 
            style={styles.avatar} 
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
          {item.full_name}
        </Text>
        <Text style={styles.memberRole} numberOfLines={1} ellipsizeMode="tail">
          {item.position || 'Team Member'}
        </Text>
        <Text style={styles.memberDepartment} numberOfLines={1} ellipsizeMode="tail">
          {item.department || 'No department'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <AppHeader title="My Team" showMenu={false} />
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search team members..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={filteredMembers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#2563eb']}
              tintColor="#2563eb"
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="people" size={48} color="#cbd5e1" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No team members found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search term' : 'Your team members will appear here'}
              </Text>
            </View>
          }
          ListFooterComponent={
            filteredMembers.length > 0 ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} found
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#0f172a',
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: '#dbeafe',
  },
  avatarText: {
    color: '#1e40af',
    fontWeight: '600',
    fontSize: 18,
  },
  memberInfo: {
    flex: 1,
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 2,
  },
  memberDepartment: {
    fontSize: 13,
    color: '#94a3b8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
  }
});

export default MyTeamScreen;
