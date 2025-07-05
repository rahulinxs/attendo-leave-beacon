import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';
import { APP_NAME } from '../branding';

const TeamsScreen = () => {
  const { profileData } = useUserProfile();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeamMembers();
  }, [profileData]);

  const fetchTeamMembers = async () => {
    if (!profileData?.profile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('profiles')
        .select('id, name, email, role, department, position');

      const userRole = profileData.profile.role;
      const userId = profileData.profile.id;
      const companyId = profileData.profile.company_id;

      if (userRole === 'super_admin') {
        // Super admin sees all profiles
        query = query;
      } else if (userRole === 'admin') {
        // Admin sees all profiles in their company
        query = query.eq('company_id', companyId);
      } else if (userRole === 'reporting_manager') {
        // Manager sees their team members
        query = query.eq('reporting_manager_id', userId);
      } else {
        // Employee sees only themselves
        query = query.eq('id', userId);
      }

      const { data, error } = await query;
      
      if (error) {
        setError(error.message);
      } else {
        setTeamMembers(data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'reporting_manager': return 'Manager';
      case 'employee': return 'Employee';
      default: return role;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{APP_NAME} Teams</Text>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{APP_NAME} Teams</Text>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME} Teams</Text>
      <Text style={styles.subtitle}>
        {profileData?.profile?.role === 'super_admin' ? 'All Users' :
         profileData?.profile?.role === 'admin' ? 'Company Members' :
         profileData?.profile?.role === 'reporting_manager' ? 'Team Members' :
         'Your Profile'}
      </Text>
      <FlatList
        data={teamMembers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberItem}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberEmail}>{item.email}</Text>
            <Text style={styles.memberRole}>{getRoleDisplayName(item.role)}</Text>
            {item.department && <Text style={styles.memberDept}>{item.department}</Text>}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No team members found</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#22223b', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 16, textAlign: 'center' },
  memberItem: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  memberName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  memberEmail: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  memberRole: { fontSize: 14, color: '#2563eb', fontWeight: '500', marginBottom: 2 },
  memberDept: { fontSize: 12, color: '#64748b' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 20 },
});

export default TeamsScreen; 