import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'attendance') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'leave') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'teams') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingTop: 8,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen 
        name="index" 
        options={{ title: 'Dashboard' }}
      />
      <Tabs.Screen 
        name="attendance" 
        options={{ title: 'Attendance' }}
      />
      <Tabs.Screen 
        name="leave" 
        options={{ title: 'Leave' }}
      />
      <Tabs.Screen 
        name="teams" 
        options={{ title: 'Teams' }}
      />
      <Tabs.Screen 
        name="profile" 
        options={{ title: 'Profile' }}
      />
    </Tabs>
  );
}
