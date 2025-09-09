import React, { useRef } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Animated, Text } from 'react-native';
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
  console.log('=== CustomDrawer Render ===');
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { profileData } = useUserProfile();
  const userRole = profileData?.profile?.role || 'employee';
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Add debug logging
  console.log('Debug - User role:', userRole);
  console.log('Debug - Profile data:', JSON.stringify(profileData, null, 2));
  
  const getAvailableModules = (): DrawerItemType[] => {
    console.log('=== getAvailableModules ===');
    console.log('Current user role:', userRole);
    
    const allModules: DrawerItemType[] = [
      { label: 'Home', icon: 'home' as const, screen: 'Home', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      { label: 'Attendance', icon: 'time' as const, screen: 'Attendance', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      { label: 'Leave', icon: 'calendar' as const, screen: 'Leave', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      { label: 'Reports', icon: 'stats-chart' as const, screen: 'Reports', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Recruitment', icon: 'people' as const, screen: 'RecruitmentReports', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Employees', icon: 'people' as const, screen: 'EmployeeManagement', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Team', icon: 'people-circle' as const, screen: 'TeamManagement', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Leave Types', icon: 'list' as const, screen: 'LeaveTypes', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Holidays', icon: 'calendar' as const, screen: 'HolidayManagement', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Profile', icon: 'person' as const, screen: 'Profile', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      { label: 'Settings', icon: 'settings' as const, screen: 'Settings', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
    ];

    const filtered = allModules.filter(module => {
      const hasAccess = module.roles.includes(userRole);
      console.log(`Module: ${module.label} - Access: ${hasAccess} (Required roles: ${module.roles.join(', ')})`);
      return hasAccess;
    });
    
    console.log('Available modules for', userRole, ':', filtered.map(m => m.label));
    return filtered;
  };

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderMenuItems = () => {
    console.log('=== renderMenuItems ===');
    const modules = getAvailableModules();
    
    // Categorize modules
    // Log all available modules first
    console.log('All available modules:', modules.map(m => m.label));
    
    // Categorize modules
    const mainModules = modules.filter(m => ['Home', 'Attendance', 'Leave'].includes(m.label));
    const reportModules = modules.filter(m => ['Reports', 'Recruitment'].includes(m.label));
    const hrModules = modules.filter(m => ['Employees', 'Team', 'Leave Types', 'Holidays'].includes(m.label));
    const userModules = modules.filter(m => ['Profile', 'Settings'].includes(m.label));
    
    // Debug log each category
    console.log('Main modules:', mainModules.map(m => m.label));
    console.log('Report modules:', reportModules.map(m => m.label));
    console.log('HR modules:', hrModules.map(m => m.label));
    console.log('User modules:', userModules.map(m => m.label));

    const renderModuleSection = (title: string, items: DrawerItemType[]) => {
      if (items.length === 0) return null;
      
      return (
        <View style={styles.section}>
          {renderSectionHeader(title)}
          {items.map((item, index) => (
            <DrawerItem
              key={`${title.toLowerCase()}-${index}`}
              label={item.label}
              onPress={() => navigation.navigate(item.screen)}
              icon={({ color, size }) => (
                <Ionicons name={item.icon} size={size} color={color} />
              )}
              labelStyle={styles.label}
              style={styles.menuItem}
            />
          ))}
        </View>
      );
    };

    return (
      <>
        {/* Main Modules */}
        {renderModuleSection('Main', mainModules)}
        
        {/* Reports Section */}
        {reportModules.length > 0 && renderModuleSection('Reports', reportModules)}
        
        {/* Human Resource Section */}
        {hrModules.length > 0 && renderModuleSection('Human Resource', hrModules)}
        
        {/* Account Section */}
        <View style={styles.section}>
          {renderSectionHeader('Account')}
          {userModules.map((item, index) => (
            <DrawerItem
              key={`account-${index}`}
              label={item.label}
              onPress={() => navigation.navigate(item.screen)}
              icon={({ color, size }) => (
                <Ionicons name={item.icon} size={size} color={color} />
              )}
              labelStyle={styles.label}
              style={styles.menuItem}
            />
          ))}
          <DrawerItem
            label="Logout"
            onPress={logout}
            icon={({ color, size }) => (
              <Ionicons name="log-out" size={size} color="#ef4444" />
            )}
            labelStyle={[styles.label, { color: '#ef4444' }]}
            style={styles.menuItem}
          />
        </View>
      </>
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
        
        {renderMenuItems()}
      </DrawerContentScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 10,
  },
  userRole: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
  },
  section: {
    marginVertical: 10,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    marginVertical: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: -16,
  },
});

export default CustomDrawer;
