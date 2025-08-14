import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LogIn, UserPlus } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const { login, signup, isLoading } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async () => {
    if (mode === 'login') {
      await login(email, password);
    } else {
      await signup(email, password, name);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>AttendEdge</Text>
        <Text style={styles.tagline}>Smart Attendance & Leave Management</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{mode === 'login' ? 'Sign In' : 'Sign Up'}</Text>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => setMode('login')}>
            <LogIn size={16} color={mode === 'login' ? '#1d4ed8' : '#475569'} />
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'signup' && styles.tabActive]} onPress={() => setMode('signup')}>
            <UserPlus size={16} color={mode === 'signup' ? '#1d4ed8' : '#475569'} />
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {mode === 'signup' && (
          <View style={styles.field}> 
            <Text style={styles.label}>Full Name</Text>
            <TextInput placeholder="John Doe" style={styles.input} value={name} onChangeText={setName} />
          </View>
        )}
        <View style={styles.field}> 
          <Text style={styles.label}>Email</Text>
          <TextInput placeholder="your@company.com" keyboardType="email-address" autoCapitalize="none" style={styles.input} value={email} onChangeText={setEmail} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput placeholder="Enter your password" secureTextEntry={!showPassword} style={[styles.input, { paddingRight: 60 }]} value={password} onChangeText={setPassword} />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Text style={{ color: '#0f172a', fontSize: 12 }}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.button} disabled={isLoading} onPress={onSubmit}>
          <Text style={styles.buttonText}>{isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={styles.link}>{mode === 'login' ? "Don't have an account? Sign up" : 'Have an account? Sign in'}</Text>
        </TouchableOpacity>

        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo Credentials</Text>
          <View style={styles.demoRow}>
            <View style={styles.demoCard}>
              <Text style={styles.demoRole}>Super Admin</Text>
              <Text style={styles.demoText}>Email: rahul@nytp.com</Text>
              <Text style={styles.demoText}>Password: password123</Text>
            </View>
            <View style={styles.demoCard}>
              <Text style={styles.demoRole}>Admin</Text>
              <Text style={styles.demoText}>Email: admin@company.com</Text>
              <Text style={styles.demoText}>Password: password123</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  header: { alignItems: 'center', marginTop: 24, marginBottom: 16 },
  logo: { width: 56, height: 56, borderRadius: 14, marginBottom: 8 },
  appName: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  tagline: { fontSize: 12, color: '#475569', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  tabs: { flexDirection: 'row', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  tabActive: { backgroundColor: '#eef2ff' },
  tabText: { color: '#475569', fontWeight: '600' },
  tabTextActive: { color: '#1d4ed8' },
  field: { marginBottom: 12 },
  label: { marginBottom: 6, color: '#334155', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8fafc' },
  eyeBtn: { position: 'absolute', right: 12, top: 12, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#e2e8f0', borderRadius: 6 },
  button: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { color: '#2563eb', textAlign: 'center', fontWeight: '600' },
  demoBox: { marginTop: 12 },
  demoTitle: { fontWeight: '700', marginBottom: 8, color: '#0f172a' },
  demoRow: { flexDirection: 'row', gap: 8 },
  demoCard: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  demoRole: { fontWeight: '700', marginBottom: 4 },
  demoText: { color: '#334155', fontSize: 12 },
});


