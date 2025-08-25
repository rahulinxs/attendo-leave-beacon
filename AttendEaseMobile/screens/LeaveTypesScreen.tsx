import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';

interface LeaveType {
  id: string;
  name: string;
  max_days_per_year: number;
  is_active: boolean;
  description?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

const LeaveTypesScreen = () => {
  const { company } = useCompany();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      if (!company?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('leave_types')
          .select('*')
          .eq('company_id', company.id)
          .order('name', { ascending: true });

        if (error) throw error;
        
        setLeaveTypes(data || []);
      } catch (err) {
        console.error('Error fetching leave types:', err);
        setError('Failed to load leave types');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveTypes();
  }, [company?.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (leaveTypes.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No leave types found for your company.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leave Types & Quotas</Text>
      <Text style={styles.subtitle}>Company: {company?.name || 'N/A'}</Text>
      
      <FlatList
        data={leaveTypes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.leaveName}>{item.name}</Text>
              <Text style={styles.quota}>
                {item.max_days_per_year} days/year
              </Text>
            </View>
            {item.description && (
              <Text style={styles.description}>{item.description}</Text>
            )}
            <Text style={[
              styles.status, 
              item.is_active ? styles.active : styles.inactive
            ]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leaveName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  quota: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  status: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: '500',
  },
  active: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  inactive: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
  },
});

export default LeaveTypesScreen;
