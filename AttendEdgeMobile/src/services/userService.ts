import { apiClient } from './api/apiClient';
import { ENDPOINTS } from '../config';
import * as SecureStore from 'expo-secure-store';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatar?: string;
  position?: string;
  department?: string;
  hireDate?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileParams {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  position?: string;
  department?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  startOfWeek?: number;
  hideWeekends: boolean;
  defaultCalendarView: 'day' | 'week' | 'month';
}

class UserService {
  /**
   * Get current user's profile
   */
  async getProfile(): Promise<UserProfile> {
    try {
      // Try to get from secure storage first
      const cachedProfile = await SecureStore.getItemAsync('userProfile');
      if (cachedProfile) {
        try {
          return JSON.parse(cachedProfile);
        } catch (e) {
          console.warn('Failed to parse cached profile', e);
        }
      }

      // If not in cache or parsing failed, fetch from API
      const response = await apiClient.get<UserProfile>(ENDPOINTS.USER.PROFILE);
      
      // Cache the profile
      await SecureStore.setItemAsync('userProfile', JSON.stringify(response));
      
      return response;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UpdateProfileParams): Promise<UserProfile> {
    try {
      const response = await apiClient.patch<UserProfile>(
        ENDPOINTS.USER.PROFILE,
        updates
      );
      
      // Update cached profile
      const cachedProfile = await SecureStore.getItemAsync('userProfile');
      if (cachedProfile) {
        const profile = JSON.parse(cachedProfile);
        const updatedProfile = { ...profile, ...updates };
        await SecureStore.setItemAsync('userProfile', JSON.stringify(updatedProfile));
      }
      
      return response;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update user avatar
   */
  async updateAvatar(uri: string): Promise<{ avatarUrl: string }> {
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await apiClient.post<{ avatarUrl: string }>(
        `${ENDPOINTS.USER.PROFILE}/avatar`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Update cached profile
      const cachedProfile = await SecureStore.getItemAsync('userProfile');
      if (cachedProfile) {
        const profile = JSON.parse(cachedProfile);
        profile.avatar = response.avatarUrl;
        await SecureStore.setItemAsync('userProfile', JSON.stringify(profile));
      }

      return response;
    } catch (error) {
      console.error('Failed to update avatar:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      // Try to get from secure storage first
      const cachedPrefs = await SecureStore.getItemAsync('userPreferences');
      if (cachedPrefs) {
        try {
          return JSON.parse(cachedPrefs);
        } catch (e) {
          console.warn('Failed to parse cached preferences', e);
        }
      }

      // If not in cache or parsing failed, fetch from API
      const response = await apiClient.get<UserPreferences>(
        ENDPOINTS.USER.PREFERENCES
      );
      
      // Cache the preferences
      await SecureStore.setItemAsync('userPreferences', JSON.stringify(response));
      
      return response;
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
      // Return default preferences if API fails
      return this.getDefaultPreferences();
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
      const response = await apiClient.patch<UserPreferences>(
        ENDPOINTS.USER.PREFERENCES,
        updates
      );
      
      // Update cached preferences
      const currentPrefs = await this.getPreferences();
      const updatedPrefs = { ...currentPrefs, ...updates };
      await SecureStore.setItemAsync(
        'userPreferences',
        JSON.stringify(updatedPrefs)
      );
      
      return response;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Change user password
   */
  async changePassword(params: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        `${ENDPOINTS.USER.PROFILE}/change-password`,
        params
      );
      return response;
    } catch (error) {
      console.error('Failed to change password:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'system',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      weekStartsOn: 0, // Sunday
      hideWeekends: false,
      defaultCalendarView: 'week',
    };
  }

  private handleError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(data?.message || 'Invalid request');
        case 401:
          return new Error('Session expired. Please login again.');
        case 403:
          return new Error('You do not have permission to perform this action');
        case 404:
          return new Error('User not found');
        case 409:
          return new Error(data?.message || 'Conflict with current state');
        case 413:
          return new Error('File size too large. Maximum size is 5MB.');
        case 415:
          return new Error('Unsupported file type. Please upload a JPG or PNG image.');
        case 500:
          return new Error('Server error. Please try again later.');
        default:
          return new Error(data?.message || 'An error occurred');
      }
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }
}

export const userService = new UserService();
