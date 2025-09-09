import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import AuthScreen from './screens/AuthScreen';
import { MainTabs } from './src/app/tabs';
import CustomDrawer from './src/components/CustomDrawer';
import { enableScreens } from 'react-native-screens';

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
  return (
    <Drawer.Navigator
      drawerContent={(props) => {
        console.log('Drawer props:', JSON.stringify(props.state, null, 2));
        return <CustomDrawer {...props} />;
      }}
      screenOptions={{
        headerShown: false,
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
        gestureHandlerProps: {
          activeOffsetX: [-20, 20],
        },
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Attendance" component={AttendanceScreen} />
      <Drawer.Screen name="AttendanceManagement" component={AttendanceManagementScreen} />
      <Drawer.Screen name="Leave" component={LeaveScreen} />
      <Drawer.Screen name="LeaveManagement" component={LeaveManagementScreen} />
      <Drawer.Screen name="Reports" component={ReportsScreen} />
      <Drawer.Screen name="RecruitmentReports" component={RecruitmentReportsScreen} />
      <Drawer.Screen name="EmployeeManagement" component={EmployeeManagementScreen} />
      <Drawer.Screen name="TeamManagement" component={TeamManagementScreen} />
      <Drawer.Screen name="LeaveTypes" component={LeaveTypesScreen} />
      <Drawer.Screen name="HolidayManagement" component={HolidayManagementScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null; // Or a loading spinner
  
  return (
    <Stack.Navigator>
      {user ? (
        <Stack.Screen 
          name="Drawer" 
          component={DrawerNavigator} 
          options={{ headerShown: false }} 
        />
      ) : (
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen} 
          options={{ headerShown: false }} 
        />
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
