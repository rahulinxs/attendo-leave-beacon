import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../lib/useUserProfile';
import { useCompany } from '../contexts/CompanyContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../src/components/AppHeader';

type ModuleType = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  roles: string[];
};

type NavigationProps = {
  navigate: (screen: string) => void;
  goBack: () => void;
};

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProps>();
  const { user } = useAuth();
  const { profileData } = useUserProfile();
  const { company, loading: companyLoading } = useCompany();
  const userRole = profileData?.profile?.role || 'employee';
  
  // Debug logging
  console.log('User role from profile:', userRole);
  console.log('Profile data:', JSON.stringify(profileData, null, 2));
  
  // Get company display name
  const getCompanyDisplay = () => {
    if (companyLoading) return 'Loading...';
    if (company) return company.name || 'Unnamed Company';
    return 'No company assigned';
  };

  // Define modules with role-based access
  const availableModules = useMemo(() => {
    const allModules: ModuleType[] = [
      // Regular modules
      { label: 'Attendance', icon: 'time', screen: 'Attendance', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      { label: 'Leave', icon: 'calendar', screen: 'Leave', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      { label: 'Reports', icon: 'stats-chart', screen: 'Reports', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Recruitment Reports', icon: 'people', screen: 'RecruitmentReports', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Settings', icon: 'settings', screen: 'Settings', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      { label: 'Profile', icon: 'person', screen: 'Profile', roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] },
      
      // Management modules
      { label: 'Employee Management', icon: 'people', screen: 'EmployeeManagement', roles: ['admin', 'super_admin'] },
      { label: 'Attendance Management', icon: 'list', screen: 'AttendanceManagement', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Leave Management', icon: 'document-text', screen: 'LeaveManagement', roles: ['reporting_manager', 'admin', 'super_admin'] },
      { label: 'Leave Types Management', icon: 'list-circle', screen: 'LeaveTypes', roles: ['admin', 'super_admin'] },
      { label: 'Team Management', icon: 'people-circle', screen: 'TeamManagement', roles: ['admin', 'super_admin'] },
      { label: 'Holiday Management', icon: 'calendar', screen: 'HolidayManagement', roles: ['admin', 'super_admin'] },
    ];

    return allModules.filter(module => module.roles.includes(userRole));
  }, [userRole]);

  const handleLinkPress = (screen: string) => {
    navigation.navigate(screen);
  };

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    console.log('Getting display name for role:', role);
    const displayName = (() => {
      switch(role) {
        case 'admin':
          return 'Administrator';
        case 'super_admin':
          return 'Super Admin';
        case 'reporting_manager': 
          return 'Reporting Manager';
        case 'employee': 
          return 'Employee';
        default: 
          return role.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '); // Convert snake_case to Title Case
      }
    })();
    console.log(`Role '${role}' display name: '${displayName}'`);
    return displayName;
  };

  // Debug: Log the current user role and type
  console.log('Current user role:', userRole, 'Type:', typeof userRole);
  console.log('Role comparison:', {
    isReportingManager: userRole === 'reporting_manager',
    isAdmin: userRole === 'admin',
    isSuperAdmin: userRole === 'super_admin'
  });

  // Define role-specific module categories
  const isManager = userRole === 'reporting_manager' || userRole === 'admin' || userRole === 'super_admin';
  console.log('isManager calculated as:', isManager);
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Common modules for all roles
  const regularModules = availableModules.filter(module => 
    ['Attendance', 'Leave', 'Profile', 'Settings'].includes(module.label)
  );
  
  // Reporting manager specific modules
  const reportingManagerModules = isManager ? availableModules.filter(module => [
    'Reports',
    'Recruitment Reports',
    'Attendance Management',
    'Leave Management'
  ].includes(module.label)) : [];
  
  // HR/Admin specific modules
  const hrModules = isAdmin ? availableModules.filter(module => [
    'Employee Management', 
    'Team Management', 
    'Holiday Management',
    'Leave Types Management'
  ].includes(module.label)) : [];
  
  // Other modules that don't fit the above categories
  const otherModules = availableModules.filter(module => 
    !regularModules.includes(module) && 
    !reportingManagerModules.includes(module) && 
    !hrModules.includes(module)
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader 
        title="Dashboard" 
        onBackPress={() => navigation.goBack()}
        showBack={false}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>
              Welcome back,
            </Text>
            <Text style={styles.userName}>
              {profileData?.profile?.name || user?.email}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {getRoleDisplayName(userRole)}
              </Text>
            </View>
          </View>
          <View style={styles.companyInfo}>
            <Ionicons name="business" size={20} color="#4b5563" />
            <Text style={styles.companyName} numberOfLines={1}>
              {getCompanyDisplay()}
            </Text>
          </View>
        </View>

        {/* Quick Access Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.cardGrid}>
            {regularModules.map((item) => (
              <TouchableOpacity 
                key={item.screen} 
                style={[styles.card, styles.quickAccessCard]}
                onPress={() => handleLinkPress(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.cardIconContainer, styles.quickAccessIcon]}>
                  <Ionicons 
                    name={item.icon} 
                    size={24} 
                    color="#2563eb" 
                  />
                </View>
                <Text style={[styles.cardText, styles.quickAccessText]} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reporting Manager Section */}
        {isManager && reportingManagerModules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Management</Text>
            <View style={styles.cardGrid}>
              {reportingManagerModules.map((item) => (
                <TouchableOpacity 
                  key={item.screen} 
                  style={[styles.card, styles.managerCard]}
                  onPress={() => handleLinkPress(item.screen)}
                >
                  <View style={styles.cardIconContainer}>
                    <Ionicons 
                      name={item.icon} 
                      size={24} 
                      color="#3b82f6" 
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={2}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* HR/Admin Section */}
        {isAdmin && hrModules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>
            <View style={styles.cardGrid}>
              {hrModules.map((item) => (
                <TouchableOpacity 
                  key={item.screen} 
                  style={[styles.card, styles.adminCard]}
                  onPress={() => handleLinkPress(item.screen)}
                >
                  <View style={[styles.cardIconContainer, styles.adminIconContainer]}>
                    <Ionicons 
                      name={item.icon} 
                      size={24} 
                      color="#8b5cf6" 
                    />
                  </View>
                  <Text style={[styles.cardText, styles.adminCardText]} numberOfLines={2}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Other Modules Section */}
        {otherModules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>More</Text>
            <View style={styles.cardGrid}>
              {otherModules.map((item) => (
                <TouchableOpacity 
                  key={item.screen} 
                  style={[styles.card, styles.otherCard]}
                  onPress={() => handleLinkPress(item.screen)}
                >
                  <View style={[styles.cardIconContainer, styles.otherIconContainer]}>
                    <Ionicons 
                      name={item.icon} 
                      size={24} 
                      color="#10b981" 
                    />
                  </View>
                  <Text style={[styles.cardText, styles.otherCardText]} numberOfLines={2}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  userInfo: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
    textTransform: 'capitalize',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  companyName: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  // Base card style
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  // Quick Access Card
  quickAccessCard: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  quickAccessIcon: {
    backgroundColor: '#e0f2fe',
  },
  quickAccessText: {
    color: '#0369a1',
  },
  // Manager card style
  managerCard: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  // Admin card style
  adminCard: {
    backgroundColor: '#f5f3ff',
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  adminCardText: {
    color: '#4c1d95',
  },
  adminIconContainer: {
    backgroundColor: '#ede9fe',
  },
  // Other modules card style
  otherCard: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  otherCardText: {
    color: '#065f46',
  },
  otherIconContainer: {
    backgroundColor: '#d1fae5',
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
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