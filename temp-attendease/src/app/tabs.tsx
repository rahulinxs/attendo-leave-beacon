import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';

// Import screens
import HomeScreen from '../../screens/HomeScreen';
import AttendanceScreen from '../../screens/AttendanceScreen';
import LeaveScreen from '../../screens/LeaveScreen';
import ReportsScreen from '../../screens/ReportsScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import MyTeamScreen from '../../screens/MyTeamScreen';

type RootTabParamList = {
  Home: undefined;
  Attendance: undefined;
  Leave: undefined;
  MyTeam: undefined;
  Reports: undefined;
  Settings: undefined;
};

type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const screenOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarShowLabel: true,
  tabBarActiveTintColor: '#2563eb',
  tabBarInactiveTintColor: '#94a3b8',
  tabBarStyle: { 
    height: 60, 
    paddingBottom: 8, 
    paddingTop: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    marginBottom: 4,
  },
  tabBarItemStyle: {
    paddingHorizontal: 2,
    minHeight: 40,
  },
  tabBarIconStyle: {
    marginTop: 4,
  },
};


const getTabBarIcon = (routeName: keyof RootTabParamList) => {
  const iconMap = {
    'Home': 'home',
    'Attendance': 'time',
    'Leave': 'calendar',
    'MyTeam': 'people',
    'Reports': 'stats-chart',
    'Settings': 'settings',
  } as const;

  return ({ color, size }: { color: string; size: number }) => {
    const iconName = iconMap[routeName] || 'ellipse';
    return (
      <Ionicons 
        name={iconName} 
        size={22} 
        color={color} 
      />
    );
  };
};

export const MainTabs = () => {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: getTabBarIcon('Home')
        }}
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceScreen}
        options={{
          tabBarIcon: getTabBarIcon('Attendance')
        }}
      />
      <Tab.Screen 
        name="Leave" 
        component={LeaveScreen}
        options={{
          tabBarIcon: getTabBarIcon('Leave')
        }}
      />
      <Tab.Screen 
        name="MyTeam" 
        component={MyTeamScreen}
        options={{
          tabBarIcon: getTabBarIcon('MyTeam')
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{
          tabBarIcon: getTabBarIcon('Reports')
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarIcon: getTabBarIcon('Settings')
        }}
      />
    </Tab.Navigator>
  );
};

