import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../lib/useUserProfile';
import { APP_NAME } from '../branding';

const LOGO = require('../assets/attendedge-logo.png');

const ProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { profileData, loading, error, updateUserProfile } = useUserProfile();

  // Editable fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (profileData?.profile) {
      setName(profileData.profile.name || '');
      setRole(profileData.profile.role || '');
      setDepartment(profileData.profile.department || '');
      setPosition(profileData.profile.position || '');
      setHireDate(profileData.profile.hire_date || '');
      setIsActive(profileData.profile.is_active !== false);
    }
  }, [profileData]);

  const handleSave = async () => {
    setSaving(true);
    await updateUserProfile({
      name,
      role,
      department,
      position,
      hire_date: hireDate,
      is_active: isActive,
    });
    setSaving(false);
    setEditing(false);
    setSuccess('Profile updated!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 16 }}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>{'< Back'}</Text>
      </TouchableOpacity>
      <Image source={LOGO} style={styles.logo} />
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          editable={editing}
        />
        <Text style={styles.label}>Email</Text>
        <Text style={styles.info}>{profileData?.profile?.email || user?.email}</Text>
        <Text style={styles.label}>Role</Text>
        <TextInput
          style={styles.input}
          value={role}
          onChangeText={setRole}
          editable={editing}
        />
        <Text style={styles.label}>Department</Text>
        <TextInput
          style={styles.input}
          value={department}
          onChangeText={setDepartment}
          editable={editing}
        />
        <Text style={styles.label}>Position</Text>
        <TextInput
          style={styles.input}
          value={position}
          onChangeText={setPosition}
          editable={editing}
        />
        <Text style={styles.label}>Hire Date</Text>
        <TextInput
          style={styles.input}
          value={hireDate}
          onChangeText={setHireDate}
          editable={editing}
          placeholder="YYYY-MM-DD"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <Text style={styles.label}>Active</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            disabled={!editing}
            style={{ marginLeft: 12 }}
          />
        </View>
        {editing ? (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        {success ? <Text style={styles.success}>{success}</Text> : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: '#f8fafc', paddingTop: 32, paddingBottom: 32 },
  backButton: { alignSelf: 'flex-start', marginLeft: 16, marginBottom: 8 },
  backText: { color: '#2563eb', fontSize: 16 },
  logo: { width: 180, height: 35, marginBottom: 16, resizeMode: 'contain' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#22223b', marginBottom: 16 },
  card: { width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, marginBottom: 16 },
  label: { fontSize: 14, color: '#64748b', marginTop: 12 },
  info: { fontSize: 16, color: '#22223b', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 16, backgroundColor: '#f9fafb' },
  editButton: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  editButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  saveButton: { backgroundColor: '#059669', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  success: { color: 'green', marginTop: 12, textAlign: 'center' },
});

export default ProfileScreen; 