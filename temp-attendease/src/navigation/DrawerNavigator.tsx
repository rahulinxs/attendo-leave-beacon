import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { RootStack } from '../app/stack';
import CustomDrawer from '../components/CustomDrawer';
import MyTeamScreen from '../../screens/MyTeamScreen';
import HomeScreen from '../../screens/HomeScreen';
import AttendanceScreen from '../../screens/AttendanceScreen';
import LeaveScreen from '../../screens/LeaveScreen';
import ReportsScreen from '../../screens/ReportsScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import AttendanceManagementScreen from '../../screens/AttendanceManagementScreen';
import LeaveManagementScreen from '../../screens/LeaveManagementScreen';
import EmployeeManagementScreen from '../../screens/EmployeeManagementScreen';
import TeamManagementScreen from '../../screens/TeamManagementScreen';
import LeaveTypesScreen from '../../screens/LeaveTypesScreen';
import HolidayManagementScreen from '../../screens/HolidayManagementScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import RecruitmentReportsScreen from '../../screens/RecruitmentReportsScreen';

const Drawer = createDrawerNavigator();

export const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      // @ts-ignore - id is required but not in the type definition
      id="RootDrawer"
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: '75%',
        },
      }}
      drawerContent={(props) => <CustomDrawer {...props} />}
      initialRouteName="Home"
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Home',
        }}
      />
      <Drawer.Screen 
        name="Attendance" 
        component={AttendanceScreen}
        options={{
          headerShown: false,
          drawerLabel: 'My Attendance',
        }}
      />
      <Drawer.Screen 
        name="Leave" 
        component={LeaveScreen}
        options={{
          headerShown: false,
          drawerLabel: 'My Leaves',
        }}
      />
      <Drawer.Screen 
        name="MyTeam" 
        component={MyTeamScreen}
        options={{
          headerShown: false,
          drawerLabel: 'My Team',
        }}
      />
      <Drawer.Screen 
        name="AttendanceManagement" 
        component={AttendanceManagementScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Attendance Management',
        }}
      />
      <Drawer.Screen 
        name="LeaveManagement" 
        component={LeaveManagementScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Leave Management',
        }}
      />
      <Drawer.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Reports',
        }}
      />
      <Drawer.Screen 
        name="RecruitmentReports" 
        component={RecruitmentReportsScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Recruitment',
        }}
      />
      <Drawer.Screen 
        name="EmployeeManagement" 
        component={EmployeeManagementScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Employee Management',
        }}
      />
      <Drawer.Screen 
        name="TeamManagement" 
        component={TeamManagementScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Team Management',
        }}
      />
      <Drawer.Screen 
        name="LeaveTypes" 
        component={LeaveTypesScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Leave Types',
        }}
      />
      <Drawer.Screen 
        name="HolidayManagement" 
        component={HolidayManagementScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Holiday Management',
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Profile',
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: false,
          drawerLabel: 'Settings',
        }}
      />
    </Drawer.Navigator>
  );
};