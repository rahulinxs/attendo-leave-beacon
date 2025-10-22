import { Drawer } from 'expo-router/drawer';
import CustomDrawer from '../../../src/components/CustomDrawer';

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={CustomDrawer}
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
      }}
    >
      <Drawer.Screen 
        name="(tabs)" 
        options={{ 
          title: 'Dashboard',
          drawerLabel: 'Dashboard',
        }}
      />
      <Drawer.Screen 
        name="attendance" 
        options={{ 
          title: 'My Attendance',
          drawerLabel: 'My Attendance',
        }}
      />
      <Drawer.Screen 
        name="attendance-management" 
        options={{ 
          title: 'Attendance Management',
          drawerLabel: 'Attendance Management',
        }}
      />
      <Drawer.Screen 
        name="leave" 
        options={{ 
          title: 'My Leaves',
          drawerLabel: 'My Leaves',
        }}
      />
      <Drawer.Screen 
        name="leave-management" 
        options={{ 
          title: 'Leave Management',
          drawerLabel: 'Leave Management',
        }}
      />
      <Drawer.Screen 
        name="reports" 
        options={{ 
          title: 'Reports',
          drawerLabel: 'Reports',
        }}
      />
      <Drawer.Screen 
        name="recruitment-reports" 
        options={{ 
          title: 'Recruitment',
          drawerLabel: 'Recruitment',
        }}
      />
      <Drawer.Screen 
        name="employee-management" 
        options={{ 
          title: 'Employee Management',
          drawerLabel: 'Employee Management',
        }}
      />
      <Drawer.Screen 
        name="team-management" 
        options={{ 
          title: 'Team Management',
          drawerLabel: 'Team Management',
        }}
      />
      <Drawer.Screen 
        name="leave-types" 
        options={{ 
          title: 'Leave Types',
          drawerLabel: 'Leave Types',
        }}
      />
      <Drawer.Screen 
        name="holiday-management" 
        options={{ 
          title: 'Holiday Management',
          drawerLabel: 'Holiday Management',
        }}
      />
      <Drawer.Screen 
        name="profile" 
        options={{ 
          title: 'My Profile',
          drawerLabel: 'My Profile',
        }}
      />
      <Drawer.Screen 
        name="settings" 
        options={{ 
          title: 'Settings',
          drawerLabel: 'Settings',
        }}
      />
    </Drawer>
  );
}
