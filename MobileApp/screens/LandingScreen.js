import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function LandingScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>AttendEdge</Text>
      <Text style={styles.tagline}>Effortless Attendance & Leave Management for Growing Teams</Text>
      <Text style={styles.subtitle}>
        Track time, manage leave, stay compliant — all in one place. The smart solution that grows with your business.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Auth')}>
        <Text style={styles.buttonText}>Login / Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f7fbff' },
  logo: { width: 64, height: 64, marginBottom: 12, borderRadius: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  tagline: { fontSize: 14, color: '#334155', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});


