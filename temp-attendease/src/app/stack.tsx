import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MainTabs } from './tabs';

// Import all screen components
import RecruitmentReportsScreen from '../../screens/RecruitmentReportsScreen';
import EmployeeManagementScreen from '../../screens/EmployeeManagementScreen';
import AttendanceManagementScreen from '../../screens/AttendanceManagementScreen';
import LeaveManagementScreen from '../../screens/LeaveManagementScreen';
import TeamManagementScreen from '../../screens/TeamManagementScreen';
import MyTeamScreen from '../../screens/MyTeamScreen';
import HolidayManagementScreen from '../../screens/HolidayManagementScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import LeaveTypesScreen from '../../screens/LeaveTypesScreen';

// Import withHeader HOC
import withHeader from '../components/withHeader';

// Define the type for the MainTabs navigator
type MainTabsParamList = {
  Home: undefined;
  Attendance: undefined;
  Leave: undefined;
  MyTeam: undefined;
  Reports: undefined;
  Settings: undefined;
};

// Define the type for our root stack param list
type RootStackParamList = {
  MainTabs: { screen?: keyof MainTabsParamList } | undefined;
  RecruitmentReports: undefined;
  LeaveManagement: undefined;
  TeamManagement: undefined;
  Profile: undefined;
  EmployeeManagement: undefined;
  AttendanceManagement: undefined;
  MyTeam: undefined;
  HolidayManagement: undefined;
  LeaveTypes: undefined;
  // Add any other screens that are in your navigation stack
  [key: string]: any; // This allows for dynamic navigation
};

const Stack = createStackNavigator<RootStackParamList>();

// Screen options type
type ScreenOptions = {
  headerShown: boolean;
};

// Common screen options with consistent styling
const screenOptions: ScreenOptions = {
  headerShown: false
};

// All screens configuration
const screens = [
  // Screens with header
  { 
    name: 'MainTabs', 
    component: withHeader(MainTabs, 'Dashboard'),
    options: { headerShown: false }
  },
  { 
    name: 'RecruitmentReports', 
    component: withHeader(RecruitmentReportsScreen, 'Reports'),
    options: { headerShown: false }
  },
  { 
    name: 'LeaveManagement', 
    component: withHeader(LeaveManagementScreen, 'Leave'),
    options: { headerShown: false }
  },
  { 
    name: 'TeamManagement', 
    component: withHeader(TeamManagementScreen, 'Team Management'),
    options: { headerShown: false }
  },
  { 
    name: 'Profile', 
    component: withHeader(ProfileScreen, 'Profile'),
    options: { headerShown: false }
  },
  // Screens without header
  { 
    name: 'EmployeeManagement', 
    component: EmployeeManagementScreen,
    options: { headerShown: false }
  },
  { 
    name: 'AttendanceManagement', 
    component: AttendanceManagementScreen,
    options: { headerShown: false }
  },
  { 
    name: 'MyTeam', 
    component: withHeader(MyTeamScreen, 'My Team'),
    options: { headerShown: false }
  },
  { 
    name: 'HolidayManagement', 
    component: HolidayManagementScreen,
    options: { headerShown: false }
  },
  { 
    name: 'LeaveTypes', 
    component: LeaveTypesScreen,
    options: { headerShown: false }
  }
];

export const RootStack = () => {
  return (
    <Stack.Navigator 
      screenOptions={screenOptions}
      {...{ id: 'RootStack' } as any}
    >
      {screens.map((screen) => (
        <Stack.Screen
          key={screen.name}
          name={screen.name as keyof RootStackParamList}
          component={screen.component}
          options={screen.options}
        />
      ))}
    </Stack.Navigator>
  );
};
