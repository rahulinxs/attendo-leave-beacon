import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../branding';

const LOGO = require('../assets/attendedge-logo.png');

const AuthScreen = () => {
  const { login, signup, isLoading } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async () => {
    setError('');
    setSuccess('');
    if (tab === 'login') {
      if (!email || !password) {
        setError('Email and password are required.');
        return;
      }
      const res = await login(email, password);
      if (!res.success) setError(res.error || 'Login failed');
      else setSuccess('Login successful!');
    } else {
      if (!name || !email || !password || !confirmPassword) {
        setError('All fields are required.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      const res = await signup(email, password, name);
      if (!res.success) setError(res.error || 'Signup failed');
      else setSuccess('Signup successful! Please check your email to confirm.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.outerContainer}>
        <Image source={LOGO} style={styles.logo} />
        <Text style={styles.appName}>{APP_NAME}</Text>
        <Text style={styles.tagline}>Smart Attendance & Leave Management</Text>
        <View style={styles.card}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, tab === 'login' && styles.activeTab]}
              onPress={() => { setTab('login'); setError(''); setSuccess(''); }}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.activeTabText]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'signup' && styles.activeTab]}
              onPress={() => { setTab('signup'); setError(''); setSuccess(''); }}
            >
              <Text style={[styles.tabText, tab === 'signup' && styles.activeTabText]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
          {tab === 'signup' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                accessibilityLabel="Full Name"
              />
              <TextInput
                style={styles.input}
                placeholder="your@company.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="Email"
              />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={role}
                  onValueChange={setRole}
                  style={styles.picker}
                  enabled={false} // Only Admin for now
                >
                  <Picker.Item label="Admin" value="Admin" />
                </Picker>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                accessibilityLabel="Password"
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                accessibilityLabel="Confirm Password"
              />
            </>
          )}
          {tab === 'login' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="your@company.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="Email"
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                accessibilityLabel="Password"
              />
            </>
          )}
          <View style={styles.showPasswordRow}>
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'} Password</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}
          <TouchableOpacity
            style={styles.button}
            onPress={handleAuth}
            disabled={isLoading}
            accessibilityLabel={tab === 'login' ? "Sign In" : "Create Account"}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{tab === 'login' ? 'Sign In' : 'Create Account'}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  logo: { width: 180, height: 35, marginBottom: 16, resizeMode: 'contain' },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#22223b', marginBottom: 4 },
  tagline: { fontSize: 16, color: '#4a4e69', marginBottom: 24 },
  card: { width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  tabContainer: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#f1f5f9', borderRadius: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#e0e7ff' },
  tabText: { fontSize: 16, color: '#64748b', fontWeight: '500' },
  activeTabText: { color: '#2563eb', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#f9fafb' },
  pickerContainer: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginBottom: 16, backgroundColor: '#f9fafb' },
  picker: { height: 44, width: '100%' },
  showPasswordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  showPasswordText: { color: '#2563eb', fontSize: 14 },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  error: { color: 'red', marginBottom: 12, textAlign: 'center' },
  success: { color: 'green', marginBottom: 12, textAlign: 'center' },
});

export default AuthScreen; 