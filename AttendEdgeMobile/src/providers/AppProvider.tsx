import React, { useEffect, useMemo } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider, onlineManager, QueryKey } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ThemeProvider from '../theme/ThemeProvider';
import AuthProvider from './AuthProvider';
import { NotificationProvider } from './NotificationProvider';
import { OfflineProvider } from './OfflineProvider';
import { apiClient } from '../utils/api';
import storage from '../utils/storage';
import { handleError } from '../utils/error';
import { AxiosError } from 'axios';

// Configure react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes (replaced cacheTime with gcTime in newer versions)
      refetchOnWindowFocus: false,
    },
  },
});

// Set up global error handlers
queryClient.getQueryCache().config.onError = (error) => {
  handleError(error as Error, { showAlert: false });
};

queryClient.getMutationCache().config.onError = (error) => {
  handleError(error as Error, { showAlert: true });
};

// Set up network status listener
const setupNetworkStatusListener = () => {
  // Handle network reconnection
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = state.isConnected && state.isInternetReachable;
    onlineManager.setOnline(!!isOnline);
    
    if (isOnline) {
      // Sync any pending offline operations
      // This would be implemented in your offline service
      // offlineService.syncPendingOperations();
    }
  });
  
  return unsubscribe;
};

// Set up app state listener
const setupAppStateListener = () => {
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App has come to the foreground
      const isOnline = (await NetInfo.fetch()).isInternetReachable;
      onlineManager.setOnline(isOnline ?? false);
      
      // Refresh session if needed
      // await authService.refreshSessionIfNeeded();
    }
  };
  
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
};

// Set up API interceptors
const setupApiInterceptors = () => {
  // The ApiClient class already has interceptors set up internally
  // We'll use the public methods to handle authentication
  
  // No need to set up additional interceptors since the ApiClient
  // already handles token refresh and authentication
  
  // Just ensure we have proper error handling for 401 responses
  const handleError = async (error: any) => {
    if (error?.response?.status === 401) {
      // Token is invalid, clear auth data
      await storage.removeItem('authToken');
      await storage.removeItem('refreshToken');
      // You might want to navigate to login here
      // navigationRef.navigate('Auth');
    }
    return Promise.reject(error);
  };
  
  // Return a no-op cleanup function since we're not adding any interceptors
  return () => {};
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Initialize app-wide functionality
  useEffect(() => {
    // Set up network status listener
    const unsubscribeNetwork = setupNetworkStatusListener();
    
    // Set up app state listener
    const cleanupAppState = setupAppStateListener();
    
    // Set up API interceptors
    setupApiInterceptors();
    
    // Initialize any other services
    const initializeApp = async () => {
      try {
        // Initialize notification service
        // await notificationService.initialize();
        
        // Check for initial network status
        const netInfo = await NetInfo.fetch();
        onlineManager.setOnline(netInfo.isInternetReachable ?? false);
        
        // Check for stored session
        // await authService.initialize();
      } catch (error) {
        handleError(error, { showAlert: false });
      }
    };
    
    initializeApp();
    
    return () => {
      unsubscribeNetwork();
      cleanupAppState();
    };
  }, []);
  
  // Wrap children with all necessary providers
  const appContent = useMemo(() => (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <OfflineProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </OfflineProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  ), [children]);
  
  return (
    <QueryClientProvider client={queryClient}>
      {appContent}
    </QueryClientProvider>
  );
};

export default AppProvider;
