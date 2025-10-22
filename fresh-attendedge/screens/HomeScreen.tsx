import React, { useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  StatusBar,
  FlatList,
  ViewStyle,
  TextStyle,
  ImageStyle,
  StyleProp,
  ViewProps,
  TextProps
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../lib/useUserProfile';
import { useCompany } from '../contexts/CompanyContext';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../src/components/AppHeader';

type ModuleType = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  roles: string[];
};

// Define the tab navigator param list
type MainTabsParamList = {
  Home: undefined;
  Attendance: undefined;
  Leave: undefined;
  MyTeam: undefined;
  Reports: undefined;
  Settings: undefined;
};

type RootStackParamList = {
  MainTabs: { screen: keyof MainTabsParamList } | undefined;
  Attendance: undefined;
  Leave: undefined;
  MyTeam: undefined;
  Reports: undefined;
  Settings: undefined;
  Profile: undefined;
  EmployeeManagement: undefined;
  AttendanceManagement: undefined;
  LeaveManagement: undefined;
  TeamManagement: undefined;
  HolidayManagement: undefined;
  LeaveTypes: undefined;
  RecruitmentReports: undefined;
};

type NavigationProps = {
  navigate: <RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params?: RootStackParamList[RouteName] | { screen: string }
  ) => void;
  goBack: () => void;
  // Add the reset method to the navigation prop type
  reset: (state: {
    index: number;
    routes: Array<{ name: string; params?: any }>;
  }) => void;
};

const HomeScreen = () => {
  const navigation = useNavigation();
  
  const openDrawer = useCallback(() => {
    if (navigation && navigation.dispatch) {
      navigation.dispatch(DrawerActions.openDrawer());
    }
  }, [navigation]);

  const { user, logout } = useAuth();
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
      { label: 'My Team', icon: 'people', screen: 'MyTeam', roles: ['reporting_manager', 'admin', 'super_admin'] },
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

  const handleLinkPress = useCallback((screen: string) => {
    if (!navigation) {
      console.warn('Navigation not ready');
      return;
    }

    try {
      console.log(`Navigating to: ${screen}`);
      
      // For MyTeam, navigate directly to the screen in the root stack
      if (screen === 'MyTeam') {
        // First try to navigate to MyTeam in the root stack
        if (navigation.navigate) {
          navigation.navigate('MyTeam' as keyof RootStackParamList);
        }
      } else if (navigation.navigate) {
        // For other screens, use the default navigation
        (navigation as any).navigate(screen);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      
      // If direct navigation fails, try an alternative approach
      if (screen === 'MyTeam' && navigation.reset) {
        try {
          // Try to reset the navigation to the MainTabs with MyTeam selected
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs', params: { screen: 'MyTeam' } }],
          });
        } catch (resetError) {
          console.error('Reset navigation error:', resetError);
          // As a last resort, try a simple navigate if available
          if (navigation.navigate) {
            navigation.navigate('MainTabs' as any, { screen: 'MyTeam' });
          }
        }
      }
    }
  }, [navigation]);

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

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation will be handled by the auth state change in AuthContext
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Prepare sections data for the FlatList
  const sections = [
    {
      id: 'header',
      type: 'header' as const,
      data: [{
        name: profileData?.profile?.name || user?.email,
        role: userRole,
        company: getCompanyDisplay()
      }]
    },
    {
      id: 'quick-access',
      type: 'section' as const,
      title: 'Quick Access',
      data: regularModules,
      cardStyle: 'quickAccess',
      iconColor: '#2563eb'
    },
    ...(isManager && reportingManagerModules.length > 0 ? [{
      id: 'team-management',
      type: 'section' as const,
      title: 'Team Management',
      data: reportingManagerModules,
      cardStyle: 'manager',
      iconColor: '#3b82f6'
    }] : []),
    ...(isAdmin && hrModules.length > 0 ? [{
      id: 'administration',
      type: 'section' as const,
      title: 'Administration',
      data: hrModules,
      cardStyle: 'admin',
      iconColor: '#8b5cf6'
    }] : []),
    ...(otherModules.length > 0 ? [{
      id: 'more',
      type: 'section' as const,
      title: 'More',
      data: otherModules,
      cardStyle: 'other',
      iconColor: '#10b981'
    }] : [])
  ].filter(Boolean);

  // Header Component
  const HeaderSection = ({ data }: { data: { name: string; role: string; company: string }[] }) => {
    const userData = data[0];
    return (
      <View style={styles.headerCard}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{userData.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {getRoleDisplayName(userData.role)}
            </Text>
          </View>
        </View>
        <View style={styles.companyInfo}>
          <Ionicons name="business" size={20} color="#4b5563" />
          <Text style={styles.companyName} numberOfLines={1}>
            {userData.company}
          </Text>
        </View>
      </View>
    );
  };

// Module Section Component
const ModuleSection = ({ 
  title, 
  data, 
  cardStyle, 
  iconColor 
}: { 
  title: string; 
  data: ModuleType[]; 
  cardStyle: string; 
  iconColor: string;
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={data}
        renderItem={({ item: moduleItem, index }) => (
          <View style={styles.cardContainer}>
            <TouchableOpacity 
              style={[
                styles.card, 
                getDynamicStyle<ViewStyle>(styles, 'card', cardStyle, 'card')
              ].filter(Boolean) as ViewStyle[]}
              onPress={() => handleLinkPress(moduleItem.screen)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.cardIconContainer, 
                getDynamicStyle<ViewStyle>(styles, 'cardIconContainer', cardStyle, 'icon')
              ].filter(Boolean) as ViewStyle[]}>
                <Ionicons 
                  name={moduleItem.icon} 
                  size={24} 
                  color={iconColor} 
                />
              </View>
              <Text 
                style={[
                  styles.cardText, 
                  getDynamicStyle<TextStyle>(styles, 'cardText', cardStyle, 'text')
                ].filter(Boolean) as TextStyle[]}
                numberOfLines={2}
                textAlign="center"
              >
                {moduleItem.label}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item.screen}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={styles.cardGrid}
        columnWrapperStyle={styles.columnWrapper}
      />
    </View>
  );
};

// Render item for the FlatList
const renderItem = ({ item }: { item: typeof sections[0] }) => {
  if (item.type === 'header') {
    return <HeaderSection data={item.data} />;
  }

  return (
    <ModuleSection 
      title={item.title} 
      data={item.data} 
      cardStyle={item.cardStyle} 
      iconColor={item.iconColor}
    />
  );
};

return (
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor="#fff" />
    <AppHeader 
      title="Dashboard" 
      showMenu={true}
      onMenuPress={openDrawer}
      rightIcon="log-out-outline"
      onRightIconPress={handleLogout}
      iconColor="#ef4444"
    />
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section) => (
        <View key={section.id}>
          {renderItem({ item: section })}
        </View>
      ))}
    </ScrollView>
  </SafeAreaView>
);
};

// Define style types for better type safety
type CardStyle = {
  container?: ViewStyle;
  icon?: ViewStyle;
  text?: TextStyle;
  [key: string]: any; // Allow additional properties
};

type CardVariant = {
  [key: string]: CardStyle;
};

type DynamicStyles = {
  [key: string]: CardStyle | CardVariant | ViewStyle | TextStyle | any;
};

// Helper function to safely access dynamic styles
function getDynamicStyle<T extends ViewStyle | TextStyle>(
  styles: Styles,
  baseStyle: keyof Styles,
  variant: string,
  variantType: 'card' | 'icon' | 'text' = 'card'
): T | undefined {
  // Create the style key based on the variant type
  const styleKey = `${variant}${variantType === 'icon' ? 'Icon' : variantType === 'text' ? 'Text' : 'Card'}` as keyof Styles;
  
  // Try to get the variant style
  const variantStyle = styles[styleKey];
  if (variantStyle) {
    return variantStyle as T;
  }
  
  // If no variant style is found, try to get the base style
  const baseStyleValue = styles[baseStyle];
  if (baseStyleValue) {
    return baseStyleValue as T;
  }
  
  // If no base style is found, return undefined
  return undefined;
}

type Styles = {
  // Base styles
  safeArea: ViewStyle;
  container: ViewStyle;
  contentContainer: ViewStyle;
  scrollContent: ViewStyle;
  headerCard: ViewStyle;
  userInfo: ViewStyle;
  welcomeText: TextStyle;
  userName: TextStyle;
  roleBadge: ViewStyle;
  roleText: TextStyle;
  companyInfo: ViewStyle;
  companyName: TextStyle;
  sectionTitle: TextStyle;
  cardGrid: ViewStyle;
  cardContainer: ViewStyle;
  card: ViewStyle;
  cardIconContainer: ViewStyle;
  cardText: TextStyle;
  cardTitle: TextStyle;
  cardDescription: TextStyle;
  statsContainer: ViewStyle;
  statItem: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  quickActions: ViewStyle;
  actionButton: ViewStyle;
  actionButtonText: TextStyle;
  bottomSection: ViewStyle;
  bottomCard: ViewStyle;
  bottomCardTitle: TextStyle;
  bottomCardContent: ViewStyle;
  bottomCardText: TextStyle;
  bottomCardButton: ViewStyle;
  bottomCardButtonText: TextStyle;
  
  // Quick Access styles
  quickAccessCard: ViewStyle;
  quickAccessIcon: ViewStyle;
  quickAccessText: TextStyle;
  
  // Manager styles
  managerCard: ViewStyle;
  managerIcon: ViewStyle;
  managerText: TextStyle;
  
  // Admin styles
  adminCard: ViewStyle;
  adminIcon: ViewStyle;
  adminText: TextStyle;
  
  // Other component styles
  logoutButton: ViewStyle;
  logoutText: TextStyle;
} & DynamicStyles;

// Define all styles first with proper typing
const allStyles: Styles = {
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 8,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
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
    marginBottom: 4, // added marginBottom property
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  cardContainer: {
    flex: 1,
    margin: 8,
    maxWidth: '50%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
    height: 120,
    justifyContent: 'center',
  },
  quickAccessIcon: {
    backgroundColor: '#e0f2fe',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAccessText: {
    color: '#0369a1',
  },
  // Manager styles
  managerCard: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  // Admin styles
  adminCard: {
    backgroundColor: '#f5f3ff',
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  adminCardText: {
    color: '#4c1d95',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
  
  // Add any missing styles that were in the Styles type
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
  },
  bottomSection: {
    marginTop: 24,
  },
  bottomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  bottomCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  bottomCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomCardText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  bottomCardButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  bottomCardButtonText: {
    color: '#334155',
    fontWeight: '500',
  },
  
  // Add empty styles for any remaining required properties
  section: {
    marginBottom: 20,
  },
  cardGrid: {
    paddingHorizontal: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardContainer: {
    flex: 1,
    margin: 8,
    maxWidth: '50%',
  },
  cardText: {
    fontSize: 14,
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  adminIcon: {},
  adminText: {},
  managerIcon: {},
  managerText: {},
};

// Create the styles with type checking
const styles = StyleSheet.create(allStyles);

export default HomeScreen;