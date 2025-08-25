import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';

const ProfileScreen = () => {
  const { user, signOut } = useAuth();

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', screen: 'EditProfile' },
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', screen: 'Privacy' },
    { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications' },
    { icon: 'help-buoy-outline', label: 'Help & Support', screen: 'Support' },
    { icon: 'information-circle-outline', label: 'About', screen: 'About' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('../../../../assets/avatar-placeholder.png')}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editIcon}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>
            {user?.user_metadata?.full_name || 'User Name'}
          </Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          <Text style={styles.userRole}>Administrator</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>124</Text>
            <Text style={styles.statLabel}>Employees</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Teams</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>89%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                // Navigate to the respective screen
                // navigation.navigate(item.screen);
              }}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={22} color={theme.colors.textSecondary} />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>AttendEdge v1.0.0</Text>
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
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: theme.spacing.lg,
    marginTop: -theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  menuContainer: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.md,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: theme.spacing.sm,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
});

export default ProfileScreen;
