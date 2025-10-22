import React from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../lib/useUserProfile';
import { useNavigation } from '@react-navigation/native';

type DrawerItemType = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  roles: string[];
};

const CustomDrawer = (props: any) => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { profileData } = useUserProfile();
  const userRole = profileData?.profile?.role || 'employee';

  const getAvailableModules = (): DrawerItemType[] => {
    return [
      { 
        label: 'Dashboard', 
        icon: 'home-outline' as const, 
        screen: 'Home', 
        roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'My Attendance', 
        icon: 'time-outline' as const, 
        screen: 'Attendance', 
        roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'My Leaves', 
        icon: 'calendar-outline' as const, 
        screen: 'Leave', 
        roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'My Team', 
        icon: 'people-outline' as const, 
        screen: 'MyTeam', 
        roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'Attendance Management', 
        icon: 'time-outline' as const, 
        screen: 'AttendanceManagement', 
        roles: ['reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'Leave Management', 
        icon: 'calendar-outline' as const, 
        screen: 'LeaveManagement', 
        roles: ['reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'Reports', 
        icon: 'stats-chart-outline' as const, 
        screen: 'Reports', 
        roles: ['reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'Recruitment', 
        icon: 'people-outline' as const, 
        screen: 'RecruitmentReports', 
        roles: ['reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'Employee Management', 
        icon: 'people-outline' as const, 
        screen: 'EmployeeManagement', 
        roles: ['admin', 'super_admin'] 
      },
      { 
        label: 'Team Management', 
        icon: 'people-circle-outline' as const, 
        screen: 'TeamManagement', 
        roles: ['reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'Leave Types', 
        icon: 'list-outline' as const, 
        screen: 'LeaveTypes', 
        roles: ['admin', 'super_admin'] 
      },
      { 
        label: 'Holiday Calendar', 
        icon: 'calendar-outline' as const, 
        screen: 'HolidayManagement', 
        roles: ['admin', 'super_admin'] 
      },
      { 
        label: 'My Team', 
        icon: 'people-outline' as const, 
        screen: 'MyTeam', 
        roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'My Profile', 
        icon: 'person-outline' as const, 
        screen: 'Profile', 
        roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] 
      },
      { 
        label: 'Settings', 
        icon: 'settings-outline' as const, 
        screen: 'Settings', 
        roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] 
      }
    ].filter(module => module.roles.includes(userRole));
  };

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderMenuItems = () => {
    const modules = getAvailableModules();
    
    const mainModules = modules.filter(m => ['Dashboard', 'My Attendance', 'My Leaves'].includes(m.label));
    const managementModules = modules.filter(m => [
      'Attendance Management', 'Leave Management', 'Team Management', 
      'Employee Management', 'Leave Types', 'Holiday Calendar'
    ].includes(m.label));
    const reportModules = modules.filter(m => ['Reports', 'Recruitment'].includes(m.label));
    const userModules = modules.filter(m => ['My Profile', 'Settings'].includes(m.label));

    const renderMenuItem = (item: DrawerItemType) => {
      // Map drawer labels to actual screen names in the navigation
      const screenNameMap: Record<string, string> = {
        'Dashboard': 'Home',
        'My Attendance': 'Attendance',
        'My Leaves': 'Leave',
        'Reports': 'Reports',
        'Settings': 'Settings',
        'Recruitment': 'RecruitmentReports',
        'My Profile': 'Profile',
        'Employee Management': 'EmployeeManagement',
        'Team Management': 'TeamManagement',
        'Holiday Calendar': 'HolidayManagement',
        'Leave Types': 'LeaveTypes',
        'Leave Management': 'LeaveManagement',
        'Attendance Management': 'AttendanceManagement'
      };

      const getScreenName = () => screenNameMap[item.label] || item.screen;

      return (
        <DrawerItem
          key={item.screen}
          label={item.label}
          onPress={() => {
            const targetScreen = getScreenName();
            // All screens are at the root level of the navigation
            navigation.navigate(targetScreen);
          }}
          icon={({ color, size }) => (
            <Ionicons name={item.icon} size={size} color={color} />
          )}
          labelStyle={styles.label}
          style={styles.menuItem}
        />
      );
    };

    return (
      <View style={styles.container}>
        <DrawerContentScrollView {...props}>
          <View style={styles.header}>
            <Image 
              source={require('../../assets/attendedge-logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
            <Text style={styles.userName}>
              {profileData?.profile?.name || user?.email}
            </Text>
            <Text style={styles.userRole}>
              {userRole.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          
          {mainModules.length > 0 && (
            <>
              {renderSectionHeader('MAIN')}
              {mainModules.map(renderMenuItem)}
            </>
          )}
          
          {managementModules.length > 0 && (
            <>
              {renderSectionHeader('MANAGEMENT')}
              {managementModules.map(renderMenuItem)}
            </>
          )}
          
          {reportModules.length > 0 && (
            <>
              {renderSectionHeader('REPORTS')}
              {reportModules.map(renderMenuItem)}
            </>
          )}
          
          {userModules.length > 0 && (
            <>
              {renderSectionHeader('ACCOUNT')}
              {userModules.map(renderMenuItem)}
            </>
          )}
          
          <DrawerItem
            label="Logout"
            onPress={logout}
            icon={({ color, size }) => (
              <Ionicons name="log-out" size={size} color="#ef4444" />
            )}
            labelStyle={[styles.label, { color: '#ef4444' }]}
            style={styles.menuItem}
          />
        </DrawerContentScrollView>
      </View>
    );
  };

  return renderMenuItems();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  userRole: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  sectionHeader: {
    padding: 10,
    paddingLeft: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeaderText: {
    fontWeight: '600',
    color: '#555',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  menuItem: {
    marginVertical: 0,
    paddingVertical: 0,
  },
  label: {
    fontSize: 14,
    marginLeft: -10,
  },
});

export default CustomDrawer;