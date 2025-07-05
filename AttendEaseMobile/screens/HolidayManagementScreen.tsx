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
  const { userProfile } = useUserProfile();

  const loadHolidays = async () => {
    try {
      setLoading(true);
      // Mock data - this would be replaced with actual API calls
      const mockHolidays: Holiday[] = [
        {
          id: '1',
          name: 'New Year\'s Day',
          date: '2024-01-01',
          type: 'Public Holiday',
          description: 'Celebration of the new year',
          is_recurring: true,
          created_at: '2023-12-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Independence Day',
          date: '2024-07-04',
          type: 'Public Holiday',
          description: 'Independence Day celebration',
          is_recurring: true,
          created_at: '2023-12-01T00:00:00Z',
        },
        {
          id: '3',
          name: 'Christmas Day',
          date: '2024-12-25',
          type: 'Public Holiday',
          description: 'Christmas celebration',
          is_recurring: true,
          created_at: '2023-12-01T00:00:00Z',
        },
        {
          id: '4',
          name: 'Company Anniversary',
          date: '2024-03-15',
          type: 'Company Holiday',
          description: 'Company founding anniversary',
          is_recurring: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '5',
          name: 'Team Building Day',
          date: '2024-06-20',
          type: 'Optional Holiday',
          description: 'Annual team building event',
          is_recurring: false,
          created_at: '2024-02-01T00:00:00Z',
        },
      ];
      setHolidays(mockHolidays);
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

  const handleAddHoliday = () => {
    Alert.alert('Add Holiday', 'Add holiday functionality coming soon');
  };

  const handleEditHoliday = (holiday: Holiday) => {
    Alert.alert('Edit Holiday', `Edit holiday "${holiday.name}" functionality coming soon`);
  };

  const handleDeleteHoliday = (holiday: Holiday) => {
    Alert.alert(
      'Delete Holiday',
      `Are you sure you want to delete the holiday "${holiday.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Holiday deleted successfully');
            loadHolidays();
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

  const canManageHolidays = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  if (!canManageHolidays) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>You don't have permission to manage holidays.</Text>
      </View>
    );
  }

  const today = new Date();
  const filteredHolidays = holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Holiday Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddHoliday}>
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
                    onPress={() => handleEditHoliday(holiday)}
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