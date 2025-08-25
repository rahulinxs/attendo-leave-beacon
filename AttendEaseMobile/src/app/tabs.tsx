import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../../screens/HomeScreen';
import AttendanceScreen from '../../screens/AttendanceScreen';
import LeaveScreen from '../../screens/LeaveScreen';
import ReportsScreen from '../../screens/ReportsScreen';
import SettingsScreen from '../../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'home',
            Attendance: 'time',
            Leave: 'calendar',
            Reports: 'stats-chart',
            Settings: 'settings',
          };
          const name = iconMap[route.name] || 'ellipse';
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Leave" component={LeaveScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};


