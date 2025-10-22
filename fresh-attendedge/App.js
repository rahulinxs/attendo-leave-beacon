import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerItemList } from '@react-navigation/drawer';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import AuthScreen from './screens/AuthScreen';
import { MainTabs } from './src/app/tabs';
import CustomDrawer from './src/components/CustomDrawer';
import { enableScreens } from 'react-native-screens';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Optimize navigation performance
enableScreens();

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Import all screens from TypeScript files
import HomeScreen from './screens/HomeScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import AttendanceManagementScreen from './screens/AttendanceManagementScreen';
import LeaveScreen from './screens/LeaveScreen';
import LeaveManagementScreen from './screens/LeaveManagementScreen';
import ReportsScreen from './screens/ReportsScreen';
import EmployeeManagementScreen from './screens/EmployeeManagementScreen';
import TeamManagementScreen from './screens/TeamManagementScreen';
import LeaveTypesScreen from './screens/LeaveTypesScreen';
import HolidayManagementScreen from './screens/HolidayManagementScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import RecruitmentReportsScreen from './screens/RecruitmentReportsScreen';

function DrawerNavigator() {
  const { logout, setUser } = useAuth();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const navigation = useNavigation();
  
  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      
      // First clear any stored tokens
      await supabase.auth.setSession({
        access_token: '',
        refresh_token: ''
      });
      
      // Then sign out from Supabase
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Error during sign out:', signOutError);
        // Even if there's an error, we should still reset the user state
        setUser(null);
        throw signOutError;
      }
      
      // Reset user state
      setUser(null);
      
      console.log('Logout successful');
      return { success: true };
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, we should still reset the user state
      setUser(null);
      return { success: false, error: error.message };
    }
  };
  
  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawer 
          {...props} 
          onLogout={handleLogout}
          isSigningOut={isSigningOut}
        />
      )}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#4f46e5',
        drawerInactiveTintColor: '#6b7280',
        drawerLabelStyle: {
          marginLeft: -20,
          fontSize: 15,
        },
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        drawerStyle: {
          width: '80%',
          backgroundColor: '#ffffff',
        },
        sceneContainerStyle: {
          backgroundColor: '#ffffff',
        },
        swipeEnabled: true,
        gestureEnabled: true,
      }}
    >
      <Drawer.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ 
          drawerLabel: 'Home', 
          drawerIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Attendance" 
        component={AttendanceScreen} 
        options={{ title: 'My Attendance' }}
      />
      <Drawer.Screen 
        name="AttendanceManagement" 
        component={AttendanceManagementScreen} 
        options={{ title: 'Attendance Management' }}
      />
      <Drawer.Screen 
        name="Leave" 
        component={LeaveScreen} 
        options={{ title: 'My Leaves' }}
      />
      <Drawer.Screen 
        name="LeaveManagement" 
        component={LeaveManagementScreen} 
        options={{ title: 'Leave Management' }}
      />
      <Drawer.Screen 
        name="Reports" 
        component={ReportsScreen} 
        options={{ title: 'Reports' }}
      />
      <Drawer.Screen 
        name="RecruitmentReports" 
        component={RecruitmentReportsScreen} 
        options={{ title: 'Recruitment Reports' }}
      />
      <Drawer.Screen 
        name="EmployeeManagement" 
        component={EmployeeManagementScreen} 
        options={{ title: 'Employee Management' }}
      />
      <Drawer.Screen 
        name="TeamManagement" 
        component={TeamManagementScreen} 
        options={{ title: 'Team Management' }}
      />
      <Drawer.Screen 
        name="LeaveTypes" 
        component={LeaveTypesScreen} 
        options={{ title: 'Leave Types' }}
      />
      <Drawer.Screen 
        name="HolidayManagement" 
        component={HolidayManagementScreen} 
        options={{ title: 'Holiday Management' }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Settings' }}
      />
    </Drawer.Navigator>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const navigation = useNavigation();
  const [isReady, setIsReady] = React.useState(false);

  // Initialize navigation state
  React.useEffect(() => {
    // Set a small timeout to prevent flash of auth screen
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle auth state changes
  React.useEffect(() => {
    if (!isReady) return;
    
    if (user === null && !isLoading) {
      console.log('User is signed out, navigating to Auth screen');
      // Use navigation.reset to clear the navigation stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  }, [user, isLoading, navigation, isReady]);

  // Show loading indicator during initial load
  if (isLoading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <Stack.Screen name="MainApp" component={DrawerNavigator} />
      )}
    </Stack.Navigator>
  );
}

function AppContent() {
  return (
    <CompanyProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </CompanyProvider>
  );
}

// Main App component with all providers
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
