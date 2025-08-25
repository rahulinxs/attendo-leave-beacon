import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { apiClient } from '../utils/api';
import { handleError } from '../utils/error';
import { AxiosError } from 'axios';
import storage from '../lib/storage';

// Define LocalAuthentication interface
type LocalAuthType = {
  hasHardwareAsync: () => Promise<boolean>;
  isEnrolledAsync: () => Promise<boolean>;
  authenticateAsync: (options?: { promptMessage?: string }) => Promise<{ success: boolean }>;
};

// Initialize LocalAuthentication with a default implementation
let LocalAuthentication: LocalAuthType = {
  hasHardwareAsync: () => Promise.resolve(false),
  isEnrolledAsync: () => Promise.resolve(false),
  authenticateAsync: () => Promise.resolve({ success: false }),
};

// Try to load the actual implementation if available
if (Platform.OS !== 'web') {
  try {
    const expoLocalAuth = require('expo-local-authentication');
    if (expoLocalAuth) {
      LocalAuthentication = expoLocalAuth;
    }
  } catch (e) {
    console.warn('expo-local-authentication not installed, biometric features will be disabled');
  }
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Secure storage keys
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const LAST_USER_EMAIL = 'last_user_email';

export interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();

  // Initialize state
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    isBiometricAvailable: false,
    isBiometricEnabled: false,
  });

  // Check if biometric authentication is available
  const checkBiometricAvailability = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      setState(prev => ({
        ...prev,
        isBiometricAvailable: hasHardware && isEnrolled,
      }));
      
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setState(prev => ({
        ...prev,
        isBiometricAvailable: false,
      }));
      return false;
    }
  }, []);

  // Refresh token request - defined as a regular function to avoid duplicate declarations
  const refreshTokenRequest = useCallback(async (refreshToken: string): Promise<void> => {
    try {
      const response = await apiClient.post('/auth/refresh', { refreshToken });
      const { token: newToken, refreshToken: newRefreshToken, user } = response.data;
      
      // Update tokens in secure storage
      await Promise.all([
        SecureStore.setItemAsync(AUTH_TOKEN_KEY, newToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken),
      ]);
      
      // Update state with new tokens and user data
      setState(prev => ({
        ...prev,
        user,
        token: newToken,
        isAuthenticated: true,
        isLoading: false,
      }));
      
      return Promise.resolve();
    } catch (error) {
      console.error('Token refresh failed:', error);
      return Promise.reject(error);
    }
  }, []);

  // Clear authentication state
  const clearAuthState = useCallback(async (): Promise<void> => {
    // Clear tokens from secure storage
    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    
    // Clear query cache
    queryClient.clear();
    
    // Update state
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isBiometricAvailable: state.isBiometricAvailable,
      isBiometricEnabled: false,
    });
  }, [queryClient, state.isBiometricAvailable]);

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Check biometric availability
      const isBiometricAvailable = await checkBiometricAvailability();
      
      // Check if we have a token in secure storage
      const [token, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(AUTH_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);
      
      if (token && refreshToken) {
        try {
          // Use the API client to get user data
          const response = await apiClient.get('/auth/me');
          const user = response.data;
          
          // Update state with user data
          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            isBiometricAvailable,
            isBiometricEnabled: await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY) === 'true',
          });
        } catch (error) {
          // Token might be expired, try to refresh
          try {
            await refreshTokenRequest(refreshToken);
          } catch (refreshError) {
            // Refresh failed, clear auth state
            await clearAuthState();
          }
        }
      } else {
        // No tokens found, clear auth state
        await clearAuthState();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await clearAuthState();
    } finally {
      try {
        const [isBiometricAvailable, isBiometricEnabled] = await Promise.all([
          checkBiometricAvailability(),
          storage.getItem<boolean>(BIOMETRIC_ENABLED_KEY).then(value => value ?? false),
        ]);
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          isBiometricAvailable,
          isBiometricEnabled,
        }));
      } catch (error) {
        console.error('Error updating auth state:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          isBiometricAvailable: false,
          isBiometricEnabled: false,
        }));
      }
    }
  }, [checkBiometricAvailability]);

  // Fetch user data from API
  const fetchUserData = async (token: string): Promise<User> => {
    try {
      const response = await apiClient.get('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch user data');
    }
  };

  // Set authentication state
  const setAuthState = async ({
    user,
    token,
    refreshToken,
  }: {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
  }) => {
    // The API client will handle setting the token internally
    if (token) {
      // The API client will handle setting the auth header
      await SecureStore.setItemAsync('authToken', token);
    } else {
      await SecureStore.deleteItemAsync('authToken');
    }
    
    if (refreshToken) {
      await SecureStore.setItemAsync('refreshToken', refreshToken);
    } else {
      await SecureStore.deleteItemAsync('refreshToken');
    }
    
    // Update state
    setState(prev => ({
      ...prev,
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading: false,
    }));
    
    // Store tokens in secure storage
    if (token && refreshToken) {
      await Promise.all([
        SecureStore.setItemAsync(AUTH_TOKEN_KEY, token),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      ]);
      
      // Store last user email for biometric auth
      if (user?.email) {
        await storage.setItem(LAST_USER_EMAIL, user.email);
      }
    }
  };

  // Clear authentication state is defined above

  // Login with email and password
  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, token, refreshToken } = response.data;
      
      await setAuthState({ user, token, refreshToken });
      
      // Store last user email for biometric auth
      await storage.setItem(LAST_USER_EMAIL, user.email);
    } catch (error) {
      await clearAuthState();
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Register a new user
  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await apiClient.post('/auth/register', userData);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Call logout API if needed
      if (state.token) {
        try {
          await apiClient.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${state.token}` },
          });
        } catch (error) {
          console.error('Error during logout API call:', error);
        }
      }
      
      // Clear auth state
      await clearAuthState();
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  // Enable biometric authentication
  const enableBiometric = async (): Promise<void> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        throw new Error('Biometric authentication not available');
      }
      
      const { success } = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric login'
      });
      
      if (success) {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
        setState(prev => ({
          ...prev,
          isBiometricEnabled: true,
        }));
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      throw error;
    }
  };

  // Disable biometric authentication
  const disableBiometric = async () => {
    try {
      await storage.removeItem(BIOMETRIC_ENABLED_KEY);
      setState(prev => ({ ...prev, isBiometricEnabled: false }));
    } catch (error) {
      console.error('Error disabling biometric authentication:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUser = async (userData: Partial<User>) => {
    try {
      if (!state.token) throw new Error('Not authenticated');
      
      const response = await apiClient.patch(
        '/users/me',
        userData,
        { headers: { Authorization: `Bearer ${state.token}` } }
      );
      
      setState(prev => ({
        ...prev,
        user: { ...prev.user, ...response.data },
      }));
      
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // Request password reset
  const forgotPassword = async (email: string) => {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  };

  // Reset password with token
  const resetPassword = async (token: string, password: string) => {
    try {
      await apiClient.post('/auth/reset-password', { token, password });
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  // Verify email with token
  const verifyEmail = async (token: string) => {
    try {
      await apiClient.post('/auth/verify-email', { token });
      
      // Update user's email verification status
      if (state.user) {
        setState(prev => ({
          ...prev,
          user: { ...prev.user!, isEmailVerified: true },
        }));
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  };

  // Resend verification email
  const resendVerificationEmail = async () => {
    try {
      if (!state.user) throw new Error('Not authenticated');
      
      await apiClient.post('/auth/resend-verification', {
        email: state.user.email,
      });
    } catch (error) {
      console.error('Error resending verification email:', error);
      throw error;
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Set up token refresh interval
  useEffect(() => {
    if (!state.token || !state.user) return;
    
    // Refresh token 5 minutes before it expires
    const REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes
    
    const interval = setInterval(async () => {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await refreshTokenRequest(refreshToken);
      }
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [state.token, state.user]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshToken: async (): Promise<void> => {
          try {
            const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
            if (!refreshToken) {
              await clearAuthState();
              return;
            }
            
            await refreshTokenRequest(refreshToken);
          } catch (error) {
            console.error('Refresh token failed:', error);
            await clearAuthState();
            throw error;
          }
        },
        enableBiometric,
        disableBiometric,
        updateUser,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
