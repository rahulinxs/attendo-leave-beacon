import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from './AuthProvider';
import { storage } from '../utils/storage';
import { apiClient } from '../utils/api';
import { handleError } from '../utils/error';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Types
type Notification = {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  type?: string;
};

type NotificationContextType = {
  // State
  notifications: Notification[];
  unreadCount: number;
  hasPermission: boolean | null;
  isRegistered: boolean;
  
  // Methods
  registerForPushNotifications: () => Promise<string | null>;
  unregisterFromPushNotifications: () => Promise<void>;
  scheduleLocalNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => Promise<string>;
  cancelScheduledNotification: (id: string) => Promise<void>;
  cancelAllScheduledNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  getNotificationPreferences: () => Promise<NotificationPreferences>;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
};

type NotificationPreferences = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  types: {
    attendance: boolean;
    leave: boolean;
    announcement: boolean;
    reminder: boolean;
    [key: string]: boolean;
  };
};

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Storage keys
const NOTIFICATION_PREFS_KEY = '@notification_preferences';
const DEVICE_TOKEN_KEY = '@device_token';
const NOTIFICATIONS_KEY = '@notifications';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<{
    notifications: Notification[];
    hasPermission: boolean | null;
    isRegistered: boolean;
    preferences: NotificationPreferences;
  }>({
    notifications: [],
    hasPermission: null,
    isRegistered: false,
    preferences: {
      pushEnabled: true,
      emailEnabled: true,
      inAppEnabled: true,
      soundEnabled: true,
      vibrateEnabled: true,
      types: {
        attendance: true,
        leave: true,
        announcement: true,
        reminder: true,
      },
    },
  });

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const appState = useRef(AppState.currentState);

  // Load notifications and preferences on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [notifications, preferences] = await Promise.all([
          storage.getItem<Notification[]>(NOTIFICATIONS_KEY) || [],
          storage.getItem<NotificationPreferences>(NOTIFICATION_PREFS_KEY) || {
            pushEnabled: true,
            emailEnabled: true,
            inAppEnabled: true,
            soundEnabled: true,
            vibrateEnabled: true,
            types: {
              attendance: true,
              leave: true,
              announcement: true,
              reminder: true,
            },
          },
        ]);

        setState(prev => ({
          ...prev,
          notifications,
          preferences,
        }));
      } catch (error) {
        console.error('Error loading notification data:', error);
      }
    };

    loadData();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(handleNotification);
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Check permission status
    checkPermission();

    // Register for push notifications if user is authenticated
    if (isAuthenticated) {
      registerForPushNotifications();
    }

    // Set up app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Clean up listeners
      notificationListener.current?.remove();
      responseListener.current?.remove();
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Handle app state changes
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to the foreground
      await refreshNotifications();
      await checkPermission();
    }
    
    appState.current = nextAppState;
  };

  // Check notification permission status
  const checkPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      const permission = await Notification.requestPermission();
      const hasPermission = permission === 'granted';
      setState(prev => ({ ...prev, hasPermission }));
      return hasPermission;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    const hasPermission = finalStatus === 'granted';
    setState(prev => ({ ...prev, hasPermission }));
    
    return hasPermission;
  };

  // Register for push notifications
  const registerForPushNotifications = async (): Promise<string | null> => {
    try {
      // Skip on web or if already registered
      if (Platform.OS === 'web') return null;
      
      const hasPermission = await checkPermission();
      if (!hasPermission) return null;
      
      // Check if running on a physical device
      if (!Device.isDevice) {
        console.warn('Must use a physical device for push notifications');
        return null;
      }
      
      // Get the token
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      
      // Save token to storage
      await storage.setItem(DEVICE_TOKEN_KEY, token);
      
      // Register with the server if user is authenticated
      if (isAuthenticated && user) {
        try {
          await apiClient.post('/notifications/register', {
            token,
            platform: Platform.OS,
            deviceId: Device.modelName || 'unknown',
          });
          
          setState(prev => ({ ...prev, isRegistered: true }));
        } catch (error) {
          console.error('Failed to register device with server:', error);
        }
      }
      
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  };

  // Unregister from push notifications
  const unregisterFromPushNotifications = async (): Promise<void> => {
    try {
      const token = await storage.getItem<string>(DEVICE_TOKEN_KEY);
      if (!token) return;
      
      // Unregister from server if user is authenticated
      if (isAuthenticated) {
        try {
          await apiClient.post('/notifications/unregister', { token });
        } catch (error) {
          console.error('Failed to unregister device from server:', error);
        }
      }
      
      // Remove token from storage
      await storage.removeItem(DEVICE_TOKEN_KEY);
      
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      setState(prev => ({
        ...prev,
        isRegistered: false,
      }));
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
      throw error;
    }
  };

  // Schedule a local notification
  const scheduleLocalNotification = async (
    notification: Omit<Notification, 'id' | 'read' | 'createdAt'>
  ): Promise<string> => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: state.preferences.soundEnabled,
        },
        trigger: null, // Send immediately
      });
      
      // Add to local notifications list
      const newNotification: Notification = {
        ...notification,
        id,
        read: false,
        createdAt: new Date(),
      };
      
      setState(prev => ({
        ...prev,
        notifications: [newNotification, ...prev.notifications],
      }));
      
      // Save to storage
      await storage.setItem(NOTIFICATIONS_KEY, [
        newNotification,
        ...state.notifications,
      ]);
      
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  };

  // Cancel a scheduled notification
  const cancelScheduledNotification = async (id: string): Promise<void> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      
      // Remove from local notifications
      const updatedNotifications = state.notifications.filter(n => n.id !== id);
      
      setState(prev => ({
        ...prev,
        notifications: updatedNotifications,
      }));
      
      // Save to storage
      await storage.setItem(NOTIFICATIONS_KEY, updatedNotifications);
    } catch (error) {
      console.error('Error canceling notification:', error);
      throw error;
    }
  };

  // Cancel all scheduled notifications
  const cancelAllScheduledNotifications = async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Clear local notifications
      setState(prev => ({
        ...prev,
        notifications: [],
      }));
      
      // Clear storage
      await storage.removeItem(NOTIFICATIONS_KEY);
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      throw error;
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string): Promise<void> => {
    try {
      const updatedNotifications = state.notifications.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      );
      
      setState(prev => ({
        ...prev,
        notifications: updatedNotifications,
      }));
      
      // Save to storage
      await storage.setItem(NOTIFICATIONS_KEY, updatedNotifications);
      
      // Mark as read on server if it's a server-sent notification
      const notification = state.notifications.find(n => n.id === id);
      if (notification?.data?.serverId) {
        try {
          await apiClient.patch(`/notifications/${notification.data.serverId}/read`);
        } catch (error) {
          console.error('Failed to mark notification as read on server:', error);
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async (): Promise<void> => {
    try {
      const updatedNotifications = state.notifications.map(notification => ({
        ...notification,
        read: true,
      }));
      
      setState(prev => ({
        ...prev,
        notifications: updatedNotifications,
      }));
      
      // Save to storage
      await storage.setItem(NOTIFICATIONS_KEY, updatedNotifications);
      
      // Mark all as read on server
      try {
        await apiClient.post('/notifications/mark-all-read');
      } catch (error) {
        console.error('Failed to mark all notifications as read on server:', error);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  // Delete a notification
  const deleteNotification = async (id: string): Promise<void> => {
    try {
      // Remove from local notifications
      const updatedNotifications = state.notifications.filter(n => n.id !== id);
      
      setState(prev => ({
        ...prev,
        notifications: updatedNotifications,
      }));
      
      // Save to storage
      await storage.setItem(NOTIFICATIONS_KEY, updatedNotifications);
      
      // Delete from server if it's a server-sent notification
      const notification = state.notifications.find(n => n.id === id);
      if (notification?.data?.serverId) {
        try {
          await apiClient.delete(`/notifications/${notification.data.serverId}`);
        } catch (error) {
          console.error('Failed to delete notification from server:', error);
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  };

  // Clear all notifications
  const clearAllNotifications = async (): Promise<void> => {
    try {
      // Clear local notifications
      setState(prev => ({
        ...prev,
        notifications: [],
      }));
      
      // Clear storage
      await storage.removeItem(NOTIFICATIONS_KEY);
      
      // Clear all on server
      try {
        await apiClient.delete('/notifications');
      } catch (error) {
        console.error('Failed to clear all notifications on server:', error);
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  };

  // Refresh notifications from server
  const refreshNotifications = async (): Promise<void> => {
    if (!isAuthenticated) return;
    
    try {
      const response = await apiClient.get('/notifications');
      const serverNotifications = response.data;
      
      // Merge with local notifications, giving priority to local ones
      const localNotifications = state.notifications.filter(
        n => !n.data?.serverId
      );
      
      const mergedNotifications = [
        ...localNotifications,
        ...serverNotifications.map((n: any) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          data: { ...n.data, serverId: n.id },
          read: n.read,
          type: n.type,
          createdAt: new Date(n.createdAt),
        })),
      ];
      
      setState(prev => ({
        ...prev,
        notifications: mergedNotifications,
      }));
      
      // Save to storage
      await storage.setItem(NOTIFICATIONS_KEY, mergedNotifications);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      throw error;
    }
  };

  // Get notification preferences
  const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
    if (!isAuthenticated) return state.preferences;
    
    try {
      const response = await apiClient.get('/notifications/preferences');
      const prefs = response.data;
      
      setState(prev => ({
        ...prev,
        preferences: prefs,
      }));
      
      // Save to storage
      await storage.setItem(NOTIFICATION_PREFS_KEY, prefs);
      
      return prefs;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return state.preferences;
    }
  };

  // Update notification preferences
  const updateNotificationPreferences = async (
    prefs: Partial<NotificationPreferences>
  ): Promise<void> => {
    const newPrefs = {
      ...state.preferences,
      ...prefs,
      types: {
        ...state.preferences.types,
        ...(prefs.types || {}),
      },
    };
    
    setState(prev => ({
      ...prev,
      preferences: newPrefs,
    }));
    
    // Save to storage
    await storage.setItem(NOTIFICATION_PREFS_KEY, newPrefs);
    
    // Update on server if authenticated
    if (isAuthenticated) {
      try {
        await apiClient.put('/notifications/preferences', newPrefs);
      } catch (error) {
        console.error('Failed to update notification preferences on server:', error);
      }
    }
  };

  // Handle received notification
  const handleNotification = (notification: Notifications.Notification) => {
    // Update badge count
    Notifications.setBadgeCountAsync(0);
    
    // Add to local notifications if not already present
    const existingIndex = state.notifications.findIndex(
      n => n.id === notification.request.identifier
    );
    
    if (existingIndex === -1) {
      const newNotification: Notification = {
        id: notification.request.identifier,
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        data: notification.request.content.data as Record<string, any>,
        read: false,
        type: (notification.request.content.data?.type as string) || 'general',
        createdAt: new Date(),
      };
      
      setState(prev => ({
        ...prev,
        notifications: [newNotification, ...prev.notifications],
      }));
      
      // Save to storage
      storage.setItem(NOTIFICATIONS_KEY, [newNotification, ...state.notifications]);
    }
  };

  // Handle notification response (user taps on notification)
  const handleNotificationResponse = (
    response: Notifications.NotificationResponse
  ) => {
    const { notification } = response;
    
    // Mark as read
    markAsRead(notification.request.identifier);
    
    // Handle deep linking or navigation based on notification data
    const data = notification.request.content.data as Record<string, any>;
    if (data.url) {
      // Handle deep link
      // navigation.navigate(data.url);
    }
  };

  // Calculate unread count
  const unreadCount = state.notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        // State
        notifications: state.notifications,
        unreadCount,
        hasPermission: state.hasPermission,
        isRegistered: state.isRegistered,
        
        // Methods
        registerForPushNotifications,
        unregisterFromPushNotifications,
        scheduleLocalNotification,
        cancelScheduledNotification,
        cancelAllScheduledNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        refreshNotifications,
        getNotificationPreferences,
        updateNotificationPreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;
