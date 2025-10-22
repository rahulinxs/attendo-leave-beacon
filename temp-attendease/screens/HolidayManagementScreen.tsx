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
import { ScreenWrapper } from '../src/components/ScreenWrapper';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  description: string;
  is_recurring: boolean;
  created_at: string;
}

export default function HolidayManagementScreen({ navigation }: any) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const { profileData } = useUserProfile();

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('holidays')
        .select('*');
      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
      Alert.alert('Error', 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHolidays();
    setRefreshing(false);
  };

  const handleAddHoliday = async (holiday: Holiday) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('holidays')
        .insert([holiday]);
      if (error) throw error;
      Alert.alert('Success', 'Holiday added successfully');
      loadHolidays();
    } catch (error) {
      Alert.alert('Error', 'Failed to add holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleEditHoliday = async (holidayId: string, updates: Partial<Holiday>) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('holidays')
        .update(updates)
        .eq('id', holidayId);
      if (error) throw error;
      Alert.alert('Success', 'Holiday updated successfully');
      loadHolidays();
    } catch (error) {
      Alert.alert('Error', 'Failed to update holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (holiday: Holiday) => {
    Alert.alert(
      'Delete Holiday',
      `Are you sure you want to delete the holiday "${holiday.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('holidays')
                .delete()
                .eq('id', holiday.id);
              if (error) throw error;
              Alert.alert('Success', 'Holiday deleted successfully');
              loadHolidays();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete holiday');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (holiday: Holiday) => {
    Alert.alert(
      'Holiday Details',
      `Name: ${holiday.name}\nDate: ${formatDate(holiday.date)}\nType: ${holiday.type}\nDescription: ${holiday.description}\nRecurring: ${holiday.is_recurring ? 'Yes' : 'No'}`,
      [{ text: 'OK' }]
    );
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const canManageHolidays = profileData?.profile?.role === 'admin' || profileData?.profile?.role === 'super_admin';

  if (!canManageHolidays) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <Text style={styles.errorText}>You don't have permission to manage holidays.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize the time part for accurate date comparison

  const filteredHolidays = holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    holidayDate.setHours(0, 0, 0, 0); // Normalize the time part

    if (filter === 'upcoming') return holidayDate >= today;
    if (filter === 'past') return holidayDate < today;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Public Holiday': return '#3b82f6';
      case 'Company Holiday': return '#10b981';
      case 'Optional Holiday': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const isUpcoming = (dateString: string) => {
    const date = new Date(dateString);
    return date >= today;
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Holiday Management</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => {
            Alert.prompt('Add New Holiday', 'Enter holiday name', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Add',
                onPress: (name) => {
                  if (name) {
                    const newHoliday: Holiday = {
                      id: '', // Will be generated by Supabase
                      name: name,
                      date: new Date().toISOString().slice(0, 10), // Default to today
                      type: 'Public Holiday', // Default type
                      description: '',
                      is_recurring: false,
                      created_at: new Date().toISOString(),
                    };
                    handleAddHoliday(newHoliday);
                  }
                },
              },
            ]);
          }}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'All Holidays' },
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'past', label: 'Past' },
            ].map((filterOption) => (
              <TouchableOpacity
                key={filterOption.key}
                style={[
                  styles.filterButton,
                  filter === filterOption.key && styles.filterButtonActive,
                ]}
                onPress={() => setFilter(filterOption.key as any)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === filterOption.key && styles.filterButtonTextActive,
                  ]}
                >
                  {filterOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading holidays...</Text>
            </View>
          ) : filteredHolidays.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>No holidays found</Text>
            </View>
          ) : (
            filteredHolidays.map((holiday) => (
              <View key={holiday.id} style={styles.holidayCard}>
                <View style={styles.holidayHeader}>
                  <View style={styles.holidayInfo}>
                    <Text style={styles.holidayName}>{holiday.name}</Text>
                    <Text style={styles.holidayDate}>{formatDate(holiday.date)}</Text>
                  </View>
                  <View style={styles.holidayActions}>
                    <TouchableOpacity
                      style={styles.holidayActionButton}
                      onPress={() => handleViewDetails(holiday)}
                    >
                      <Ionicons name="eye" size={16} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.holidayActionButton}
                      onPress={() => {
                        Alert.prompt('Edit Holiday', 'Enter new holiday name', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Save',
                            onPress: (name) => {
                              if (name) {
                                handleEditHoliday(holiday.id, { name });
                              }
                            },
                          },
                        ]);
                      }}
                    >
                      <Ionicons name="pencil" size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.holidayActionButton}
                      onPress={() => handleDeleteHoliday(holiday)}
                    >
                      <Ionicons name="trash" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.holidayDetails}>
                  <View style={styles.typeContainer}>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: getTypeColor(holiday.type) },
                      ]}
                    >
                      <Text style={styles.typeText}>{holiday.type}</Text>
                    </View>
                    {isUpcoming(holiday.date) && (
                      <View style={styles.upcomingBadge}>
                        <Text style={styles.upcomingText}>Upcoming</Text>
                      </View>
                    )}
                    {holiday.is_recurring && (
                      <View style={styles.recurringBadge}>
                        <Ionicons name="refresh" size={12} color="#3b82f6" />
                        <Text style={styles.recurringText}>Recurring</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.holidayDescription} numberOfLines={2}>
                    {holiday.description}
                  </Text>
                </View>
              </View>
            ))
          )}
        
        </ScrollView>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 8,
  },
  filterContainer: {
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: 'white',
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
  holidayCard: {
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
  holidayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  holidayDate: {
    fontSize: 14,
    color: '#64748b',
  },
  holidayActions: {
    flexDirection: 'row',
    gap: 8,
  },
  holidayActionButton: {
    padding: 4,
  },
  holidayDetails: {
    gap: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  upcomingBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upcomingText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recurringText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  holidayDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    padding: 20,
  },
});
