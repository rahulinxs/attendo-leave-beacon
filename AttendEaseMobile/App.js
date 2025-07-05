import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import LeaveScreen from './screens/LeaveScreen';
import TeamsScreen from './screens/TeamsScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';
import EmployeeManagementScreen from './screens/EmployeeManagementScreen';
import AttendanceManagementScreen from './screens/AttendanceManagementScreen';
import LeaveManagementScreen from './screens/LeaveManagementScreen';
import TeamManagementScreen from './screens/TeamManagementScreen';
import HolidayManagementScreen from './screens/HolidayManagementScreen';

const Stack = createStackNavigator();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null; // Or a loading spinner
  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
          <Stack.Screen name="Leave" component={LeaveScreen} options={{ title: 'Leave' }} />
          <Stack.Screen name="Teams" component={TeamsScreen} options={{ title: 'Teams' }} />
          <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="EmployeeManagement" component={EmployeeManagementScreen} options={{ title: 'Employee Management' }} />
          <Stack.Screen name="AttendanceManagement" component={AttendanceManagementScreen} options={{ title: 'Attendance Management' }} />
          <Stack.Screen name="LeaveManagement" component={LeaveManagementScreen} options={{ title: 'Leave Management' }} />
          <Stack.Screen name="TeamManagement" component={TeamManagementScreen} options={{ title: 'Team Management' }} />
          <Stack.Screen name="HolidayManagement" component={HolidayManagementScreen} options={{ title: 'Holiday Management' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
