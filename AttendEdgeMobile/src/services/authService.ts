import * as SecureStore from 'expo-secure-store';
import { apiClient } from './api/apiClient';
import { ENDPOINTS, STORAGE_KEYS } from '../config';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
  };
}

class AuthService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      // Store tokens securely
      await this.storeAuthTokens(
        response.accessToken,
        response.refreshToken
      );

      // Store user data
      await SecureStore.setItemAsync(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify(response.user)
      );

      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call logout API if token exists
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_KEY);
      if (token) {
        await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Clear all auth data
      await this.clearAuthData();
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_KEY);
      return !!token;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    try {
      const userJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER_PROFILE);
      if (!userJson) return null;
      return JSON.parse(userJson);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Refresh auth token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;

      const response = await apiClient.post<{ accessToken: string }>(
        ENDPOINTS.AUTH.REFRESH,
        { refreshToken }
      );

      await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_KEY, response.accessToken);
      return response.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearAuthData();
      return null;
    }
  }

  /**
   * Store authentication tokens securely
   */
  private async storeAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN_KEY, refreshToken),
    ]);
  }

  /**
   * Clear all authentication data
   */
  private async clearAuthData(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN_KEY),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_PROFILE),
    ]);
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): Error {
    if (error.response) {
      // Handle HTTP errors
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          return new Error(data?.message || 'Invalid credentials');
        case 403:
          return new Error('Access denied');
        case 404:
          return new Error('Resource not found');
        case 500:
          return new Error('Server error');
        default:
          return new Error(data?.message || 'Authentication failed');
      }
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your connection.');
    } else {
      // Other errors
      return error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }
}

export const authService = new AuthService();
