import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useAttendance } from '../lib/useAttendance';
import { APP_NAME } from '../branding';

const AttendanceScreen = () => {
  const { today, records, loading, error, fetchAttendance, fetchToday, checkIn, checkOut } = useAttendance();

  useEffect(() => {
    fetchToday();
    fetchAttendance();
  }, []);

  const handleCheckIn = async () => {
    await checkIn();
  };

  const handleCheckOut = async () => {
    await checkOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME} Attendance</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" />
      ) : (
        <>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Today's Status</Text>
            {today?.check_in_time ? (
              <>
                <Text>Checked in at: {today.check_in_time?.slice(11, 16)}</Text>
                {today.check_out_time ? (
                  <Text>Checked out at: {today.check_out_time?.slice(11, 16)}</Text>
                ) : (
                  <TouchableOpacity style={styles.button} onPress={handleCheckOut}>
                    <Text style={styles.buttonText}>Check Out</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleCheckIn}>
                <Text style={styles.buttonText}>Check In</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.historyTitle}>Recent Attendance</Text>
          <FlatList
            data={records.slice(0, 10)}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <Text>{item.date}: {item.check_in_time ? 'Present' : 'Absent'}</Text>
              </View>
            )}
          />
        </>
      )}
      {error ? <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#22223b', marginBottom: 16, textAlign: 'center' },
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  statusTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  button: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  historyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  historyItem: { backgroundColor: '#e0e7ff', borderRadius: 8, padding: 12, marginBottom: 8 },
});

export default AttendanceScreen; 