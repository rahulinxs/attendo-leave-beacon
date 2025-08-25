import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';

const AttendanceScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceStatus, setAttendanceStatus] = useState<'check-in' | 'check-out' | 'checked-in' | 'checked-out'>('check-in');
  const [location, setLocation] = useState({ latitude: 0, longitude: 0 });
  const [showMap, setShowMap] = useState(false);

  // Mock data for attendance history
  const attendanceHistory = [
    { id: '1', date: '2023-06-01', checkIn: '09:00 AM', checkOut: '06:00 PM', status: 'present' },
    { id: '2', date: '2023-06-02', checkIn: '09:15 AM', checkOut: '06:30 PM', status: 'present' },
    { id: '3', date: '2023-06-03', checkIn: '09:30 AM', checkOut: '05:45 PM', status: 'present' },
    { id: '4', date: '2023-06-04', checkIn: '--:--', checkOut: '--:--', status: 'weekend' },
    { id: '5', date: '2023-06-05', checkIn: '09:05 AM', checkOut: '--:--', status: 'present' },
  ];

  const handleAttendanceAction = () => {
    if (attendanceStatus === 'check-in') {
      // Handle check-in
      setAttendanceStatus('checked-in');
      // In a real app, you would get the current location here
      setLocation({ latitude: 12.9716, longitude: 77.5946 });
      setShowMap(true);
    } else if (attendanceStatus === 'check-out') {
      // Handle check-out
      setAttendanceStatus('checked-out');
      setShowMap(true);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.statusText, { color: '#059669' }]}>Present</Text>
          </View>
        );
      case 'absent':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statusText, { color: '#DC2626' }]}>Absent</Text>
          </View>
        );
      case 'late':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statusText, { color: '#D97706' }]}>Late</Text>
          </View>
        );
      case 'weekend':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#E0F2FE' }]}>
            <Text style={[styles.statusText, { color: '#0284C7' }]}>Weekend</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <TouchableOpacity style={styles.calendarButton}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Current Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Today's Status</Text>
            <Text style={styles.statusDate}>{new Date().toDateString()}</Text>
          </View>
          
          <View style={styles.statusContent}>
            <View style={styles.timeContainer}>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Check In</Text>
                <Text style={styles.timeValue}>09:00 AM</Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Check Out</Text>
                <Text style={styles.timeValue}>--:--</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.actionButton,
                { 
                  backgroundColor: attendanceStatus === 'check-in' 
                    ? theme.colors.primary 
                    : attendanceStatus === 'check-out' 
                      ? theme.colors.secondary 
                      : '#E5E7EB' 
                }
              ]}
              onPress={handleAttendanceAction}
              disabled={attendanceStatus === 'checked-in' || attendanceStatus === 'checked-out'}
            >
              <Text style={[
                styles.actionButtonText,
                { color: attendanceStatus.startsWith('checked-') ? theme.colors.textSecondary : '#fff' }
              ]}>
                {attendanceStatus === 'check-in' && 'Check In'}
                {attendanceStatus === 'check-out' && 'Check Out'}
                {attendanceStatus === 'checked-in' && 'Checked In'}
                {attendanceStatus === 'checked-out' && 'Checked Out'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location Map (Conditional) */}
        {showMap && (
          <View style={styles.mapContainer}>
            <Image
              source={require('../../../../assets/map-placeholder.png')}
              style={styles.mapImage}
              resizeMode="cover"
            />
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={16} color={theme.colors.primary} />
              <Text style={styles.locationText}>
                {location.latitude}, {location.longitude}
              </Text>
            </View>
          </View>
        )}

        {/* Attendance History */}
        <View style={styles.historyContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attendance History</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyList}>
            {attendanceHistory.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyDateContainer}>
                  <Text style={styles.historyDay}>
                    {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.date).getDate()}
                  </Text>
                </View>
                <View style={styles.historyDetails}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabelSmall}>Check In:</Text>
                    <Text style={[
                      styles.timeValueSmall,
                      item.checkIn === '--:--' && styles.timeValueDisabled
                    ]}>
                      {item.checkIn}
                    </Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabelSmall}>Check Out:</Text>
                    <Text style={[
                      styles.timeValueSmall,
                      item.checkOut === '--:--' && styles.timeValueDisabled
                    ]}>
                      {item.checkOut}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyStatus}>
                  {renderStatusBadge(item.status)}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statusContent: {
    marginTop: theme.spacing.md,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  timeDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  actionButton: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mapImage: {
    width: '100%',
    height: 150,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  locationText: {
    marginLeft: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  historyContainer: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  seeAllText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  historyList: {
    marginBottom: theme.spacing.xl,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  historyDateContainer: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
    minWidth: 50,
  },
  historyDay: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  historyDate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  historyDetails: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timeLabelSmall: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  timeValueSmall: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
  timeValueDisabled: {
    color: theme.colors.textTertiary,
  },
  historyStatus: {
    marginLeft: theme.spacing.md,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default AttendanceScreen;
