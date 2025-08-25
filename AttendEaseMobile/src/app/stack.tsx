import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MainTabs } from './tabs';
import RecruitmentReportsScreen from '../../screens/RecruitmentReportsScreen';
import EmployeeManagementScreen from '../../screens/EmployeeManagementScreen';
import AttendanceManagementScreen from '../../screens/AttendanceManagementScreen';
import LeaveManagementScreen from '../../screens/LeaveManagementScreen';
import TeamManagementScreen from '../../screens/TeamManagementScreen';
import HolidayManagementScreen from '../../screens/HolidayManagementScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import LeaveTypesScreen from '../../screens/LeaveTypesScreen';

const Stack = createStackNavigator();

export const RootStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="RecruitmentReports" component={RecruitmentReportsScreen} options={{ title: 'Recruitment Reports' }} />
    <Stack.Screen name="EmployeeManagement" component={EmployeeManagementScreen} options={{ title: 'Employee Management' }} />
    <Stack.Screen name="AttendanceManagement" component={AttendanceManagementScreen} options={{ title: 'Attendance Management' }} />
    <Stack.Screen name="LeaveManagement" component={LeaveManagementScreen} options={{ title: 'Leave Management' }} />
    <Stack.Screen name="TeamManagement" component={TeamManagementScreen} options={{ title: 'Team Management' }} />
    <Stack.Screen name="HolidayManagement" component={HolidayManagementScreen} options={{ title: 'Holiday Management' }} />
    <Stack.Screen name="LeaveTypes" component={LeaveTypesScreen} options={{ title: 'Leave Types & Quotas' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);


