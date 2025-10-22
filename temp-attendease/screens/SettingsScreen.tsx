import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Appearance,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserProfile } from '../lib/useUserProfile';
import { useAuth } from '../contexts/AuthContext';
import { ScreenWrapper } from '../src/components/ScreenWrapper';

export default function SettingsScreen({ navigation }: any) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('en');
  const { profileData } = useUserProfile();
  const { logout } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled by AuthContext
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Change password functionality coming soon');
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Edit profile functionality coming soon');
  };

  const handleCompanySettings = () => {
    Alert.alert('Company Settings', 'Company settings functionality coming soon');
  };

  const handleDataExport = () => {
    Alert.alert('Export Data', 'Data export functionality coming soon');
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About AttendEdge',
      'AttendEdge v1.0.0\n\nA comprehensive attendance and leave management system for modern workplaces.\n\n© 2024 AttendEdge. All rights reserved.',
      [{ text: 'OK' }]
    );
  };

  const handleHelp = () => {
    Alert.alert('Help & Support', 'Help and support functionality coming soon');
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    // Optionally, persist theme to async storage or backend
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    // Optionally, persist language to async storage or backend
  };

  const canAccessAdminSettings = profileData?.profile?.role === 'admin' || profileData?.profile?.role === 'super_admin';

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={24} color="#3b82f6" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement && (
        <View style={styles.settingRight}>
          {rightElement}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>System Settings</Text>
        </View>
        <ScrollView style={styles.scrollView}>
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            {renderSettingItem(
              'person',
              'Edit Profile',
              'Update your personal information',
              handleEditProfile
            )}
            {renderSettingItem(
              'lock-closed',
              'Change Password',
              'Update your account password',
              handleChangePassword
            )}
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            {renderSettingItem(
              'notifications',
              'Push Notifications',
              'Receive notifications for important updates',
              undefined,
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
              />
            )}
            {renderSettingItem(
              'moon',
              'Dark Mode',
              'Use dark theme for the app',
              undefined,
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                thumbColor={darkModeEnabled ? '#ffffff' : '#f4f3f4'}
              />
            )}
            {renderSettingItem(
              'finger-print',
              'Biometric Login',
              'Use fingerprint or face ID to login',
              undefined,
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                thumbColor={biometricEnabled ? '#ffffff' : '#f4f3f4'}
              />
            )}
            {renderSettingItem(
              'sync',
              'Auto Sync',
              'Automatically sync data in background',
              undefined,
              <Switch
                value={autoSyncEnabled}
                onValueChange={setAutoSyncEnabled}
                trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                thumbColor={autoSyncEnabled ? '#ffffff' : '#f4f3f4'}
              />
            )}
          </View>

          {/* Appearance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Theme</Text>
              <View style={styles.themeOptions}>
                <TouchableOpacity onPress={() => handleThemeChange('light')} style={[styles.themeOption, theme === 'light' && styles.themeOptionSelected]}>
                  <Text style={styles.themeOptionText}>Light</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleThemeChange('dark')} style={[styles.themeOption, theme === 'dark' && styles.themeOptionSelected]}>
                  <Text style={styles.themeOptionText}>Dark</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleThemeChange('system')} style={[styles.themeOption, theme === 'system' && styles.themeOptionSelected]}>
                  <Text style={styles.themeOptionText}>System</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Language Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Language</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>App Language</Text>
              <View style={styles.languageOptions}>
                <TouchableOpacity onPress={() => handleLanguageChange('en')} style={[styles.languageOption, language === 'en' && styles.languageOptionSelected]}>
                  <Text style={styles.languageOptionText}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleLanguageChange('hi')} style={[styles.languageOption, language === 'hi' && styles.languageOptionSelected]}>
                  <Text style={styles.languageOptionText}>Hindi</Text>
                </TouchableOpacity>
                {/* Add more languages as needed */}
              </View>
            </View>
          </View>

          {/* Notification Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            {renderSettingItem(
              'notifications',
              'Push Notifications',
              'Receive push notifications',
              undefined,
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
              />
            )}
            {renderSettingItem(
              'mail',
              'Email Notifications',
              'Receive email notifications',
              undefined,
              <Switch
                value={autoSyncEnabled}
                onValueChange={setAutoSyncEnabled}
                trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                thumbColor={autoSyncEnabled ? '#ffffff' : '#f4f3f4'}
              />
            )}
          </View>

          {/* Admin Settings Section */}
          {canAccessAdminSettings && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Admin Settings</Text>
              {renderSettingItem(
                'business',
                'Company Settings',
                'Manage company information and policies',
                handleCompanySettings
              )}
              {renderSettingItem(
                'download',
                'Export Data',
                'Export attendance and leave data',
                handleDataExport
              )}
            </View>
          )}

          {/* Data & Storage Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data & Storage</Text>
            {renderSettingItem(
              'trash',
              'Clear Cache',
              'Clear app cache and temporary files',
              handleClearCache
            )}
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            {renderSettingItem(
              'help-circle',
              'Help & Support',
              'Get help and contact support',
              handleHelp
            )}
            {renderSettingItem(
              'information-circle',
              'About',
              'App version and information',
              handleAbout
            )}
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            {renderSettingItem(
              'log-out',
              'Sign Out',
              'Sign out of your account',
              handleSignOut
            )}
          </View>

          {/* User Info */}
          <View style={styles.userInfoSection}>
            <View style={styles.userInfoCard}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={32} color="#3b82f6" />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {profileData?.profile?.name}
                </Text>
                <Text style={styles.userEmail}>{profileData?.profile?.email}</Text>
                <View style={styles.userRole}>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor:
                          profileData?.profile?.role === 'super_admin' ? '#ef4444' :
                          profileData?.profile?.role === 'admin' ? '#3b82f6' :
                          profileData?.profile?.role === 'reporting_manager' ? '#10b981' : '#64748b',
                      },
                    ]}
                  >
                    <Text style={styles.roleText}>
                      {profileData?.profile?.role?.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
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
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  settingRight: {
    marginLeft: 12,
  },
  userInfoSection: {
    padding: 16,
    marginTop: 16,
  },
  userInfoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  userRole: {
    flexDirection: 'row',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  // New styles for Appearance and Language sections
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  themeOptions: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 4,
  },
  themeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  themeOptionSelected: {
    backgroundColor: '#3b82f6',
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  languageOptions: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 4,
  },
  languageOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  languageOptionSelected: {
    backgroundColor: '#3b82f6',
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
