import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api/apiClient';
import { ENDPOINTS } from '../config';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface Notification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
  type?: 'ATTENDANCE' | 'LEAVE' | 'ANNOUNCEMENT' | 'SYSTEM';
}

class NotificationService {
  private lastNotificationResponse: Notifications.NotificationResponse | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Register for push notifications
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      // Get the token that uniquely identifies this device
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;

      // Save the token to the server
      if (token) {
        await this.savePushToken(token);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  /**
   * Save push token to server
   */
  private async savePushToken(token: string): Promise<void> {
    try {
      await apiClient.post(ENDPOINTS.USER.PROFILE + '/push-token', { token });
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  /**
   * Remove push token from server
   */
  async removePushToken(token: string): Promise<void> {
    try {
      await apiClient.delete(ENDPOINTS.USER.PROFILE + '/push-token/' + token);
    } catch (error) {
      console.error('Failed to remove push token:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data: Record<string, any> = {},
    seconds = 1
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: { seconds },
    });

    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Get all notifications
   */
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    read?: boolean;
    type?: string;
  }): Promise<{ notifications: Notification[]; total: number }> {
    try {
      const response = await apiClient.get<{ notifications: Notification[]; total: number }>(
        ENDPOINTS.USER.PROFILE + '/notifications',
        { params }
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.patch(
        `${ENDPOINTS.USER.PROFILE}/notifications/${notificationId}/read`
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch(`${ENDPOINTS.USER.PROFILE}/notifications/read-all`);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(
        `${ENDPOINTS.USER.PROFILE}/notifications/${notificationId}`
      );
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners({
    onNotification,
    onNotificationResponse,
  }: {
    onNotification?: (notification: Notifications.Notification) => void;
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
  }) {
    // Remove any existing listeners
    this.removeNotificationListeners();

    // Listen for incoming notifications
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        onNotification?.(notification);
      }
    );

    // Listen for notification responses (taps)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        this.lastNotificationResponse = response;
        onNotificationResponse?.(response);
      }
    );
  }

  /**
   * Get the last notification response
   */
  getLastNotificationResponse() {
    return this.lastNotificationResponse;
  }

  /**
   * Remove notification listeners
   */
  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications() {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    }
  }
}

export const notificationService = new NotificationService();
