import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../lib/useUserProfile';
import { APP_NAME } from '../branding';

const LOGO = require('../assets/attendedge-logo.png');

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { profileData } = useUserProfile();
  const userRole = profileData?.profile?.role || 'employee';

  // Define modules with role-based access
  const getAvailableModules = () => {
    const allModules = [
      // Regular modules
      { label: 'Attendance', icon: '🕒', screen: 'Attendance', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      { label: 'Leave', icon: '🌴', screen: 'Leave', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      { label: 'Teams', icon: '👥', screen: 'Teams', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Reports', icon: '📊', screen: 'Reports', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Settings', icon: '⚙️', screen: 'Settings', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      { label: 'Profile', icon: '👤', screen: 'Profile', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      
      // Management modules
      { label: 'Employee Mgmt', icon: '👨‍💼', screen: 'EmployeeManagement', roles: ['admin', 'super_admin'] },
      { label: 'Attendance Mgmt', icon: '📋', screen: 'AttendanceManagement', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Leave Mgmt', icon: '📝', screen: 'LeaveManagement', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Team Mgmt', icon: '🏢', screen: 'TeamManagement', roles: ['admin', 'super_admin'] },
      { label: 'Holiday Mgmt', icon: '🎉', screen: 'HolidayManagement', roles: ['admin', 'super_admin'] },
    ];

    return allModules.filter(module => module.roles.includes(userRole));
  };

  const handleLinkPress = (screen) => {
    navigation.navigate(screen);
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

  const availableModules = getAvailableModules();

  // Separate regular modules from management modules
  const regularModules = availableModules.filter(module => 
    !module.label.includes('Mgmt')
  );
  const managementModules = availableModules.filter(module => 
    module.label.includes('Mgmt')
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={LOGO} style={styles.logo} />
      <Text style={styles.greeting}>Welcome, {profileData?.profile?.name || user?.email || 'User'}!</Text>
      <Text style={styles.roleText}>{getRoleDisplayName(userRole)}</Text>
      <Text style={styles.subtitle}>What would you like to do today?</Text>
      
      {/* Regular Modules */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.linksContainer}>
          {regularModules.map((module) => (
            <TouchableOpacity 
              key={module.label} 
              style={styles.linkCard} 
              onPress={() => handleLinkPress(module.screen)}
            >
              <Text style={styles.linkIcon}>{module.icon}</Text>
              <Text style={styles.linkLabel}>{module.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Management Modules */}
      {managementModules.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management</Text>
          <View style={styles.linksContainer}>
            {managementModules.map((module) => (
              <TouchableOpacity 
                key={module.label} 
                style={[styles.linkCard, styles.managementCard]} 
                onPress={() => handleLinkPress(module.screen)}
              >
                <Text style={styles.linkIcon}>{module.icon}</Text>
                <Text style={styles.linkLabel}>{module.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#f8fafc', 
    paddingVertical: 32 
  },
  logo: { 
    width: 180, 
    height: 35, 
    marginBottom: 16, 
    resizeMode: 'contain' 
  },
  greeting: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#22223b', 
    marginBottom: 4, 
    textAlign: 'center' 
  },
  roleText: { 
    fontSize: 16, 
    color: '#64748b', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#4a4e69', 
    marginBottom: 24, 
    textAlign: 'center' 
  },
  section: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  linksContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center', 
    gap: 8
  },
  linkCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 20, 
    alignItems: 'center', 
    width: 110, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 4 
  },
  managementCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  linkIcon: { 
    fontSize: 28, 
    marginBottom: 8 
  },
  linkLabel: { 
    fontSize: 14, 
    color: '#2563eb', 
    fontWeight: 'bold',
    textAlign: 'center'
  },
  logoutButton: { 
    marginTop: 16, 
    backgroundColor: '#e11d48', 
    paddingVertical: 12, 
    paddingHorizontal: 32, 
    borderRadius: 8 
  },
  logoutText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});

export default HomeScreen; 