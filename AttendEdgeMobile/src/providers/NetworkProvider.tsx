import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { useToast } from '../hooks/useToast';

type NetworkState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: NetInfoStateType | null;
  isWifiEnabled?: boolean;
  details: NetInfoState['details'] | null;
  isReconnecting: boolean;
  lastConnected: Date | null;
};

type NetworkContextType = NetworkState & {
  refresh: () => Promise<NetInfoState>;
  isConnected: boolean;
  isInternetReachable: boolean;
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NetworkState>({
    isConnected: null,
    isInternetReachable: null,
    type: null,
    isWifiEnabled: undefined,
    details: null,
    isReconnecting: false,
    lastConnected: null,
  });
  
  // Initialize toast with default values to prevent runtime errors
  const toast = useToast || {
    showInfo: (message: string) => console.log(`[INFO]: ${message}`),
    showError: (message: string) => console.error(`[ERROR]: ${message}`),
    showSuccess: (message: string) => console.log(`[SUCCESS]: ${message}`),
    showWarning: (message: string) => console.warn(`[WARNING]: ${message}`)
  };
  
  const showToast = useCallback((message: string) => {
    toast.showInfo(message);
  }, [toast]);
  const wasOffline = useRef(false);
  const appState = useRef(AppState.currentState);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  // Handle network state changes
  const handleConnectivityChange = useCallback((netInfo: NetInfoState) => {
    const { isConnected, isInternetReachable, type, details } = netInfo;
    
    setState(prev => {
      const newState = {
        ...prev,
        isConnected,
        isInternetReachable,
        type,
        details,
        isWifiEnabled: type === NetInfoStateType.wifi,
        ...(isConnected && isInternetReachable ? { lastConnected: new Date() } : {}),
      };
      
      // Update online manager for react-query
      onlineManager.setOnline(!!(isConnected && isInternetReachable));
      
      return newState;
    });
    
    // Show toast when connection status changes
    if (isConnected !== null && isInternetReachable !== null) {
      const isOnline = isConnected && isInternetReachable;
      
      if (!isOnline) {
        showToast({
          type: 'warning',
          message: 'You are currently offline. Some features may be limited.',
          duration: 5000,
        });
        wasOffline.current = true;
      } else if (wasOffline.current) {
        showToast({
          type: 'success',
          message: 'Back online',
          duration: 3000,
        });
        wasOffline.current = false;
      }
    }
  }, [showToast]);

  // Handle app state changes (foreground/background)
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to the foreground, refresh network status
      const netInfo = await refresh();
      handleConnectivityChange(netInfo);
    }
    
    appState.current = nextAppState;
  }, [handleConnectivityChange]);

  // Refresh network status
  const refresh = useCallback(async (): Promise<NetInfoState> => {
    try {
      setState(prev => ({ ...prev, isReconnecting: true }));
      
      // Add a small delay to prevent rapid state changes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const netInfo = await NetInfo.fetch();
      handleConnectivityChange(netInfo);
      
      return netInfo;
    } catch (error) {
      console.error('Error refreshing network status:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, isReconnecting: false }));
    }
  }, [handleConnectivityChange]);

  // Set up network status listener
  useEffect(() => {
    // Initial fetch
    refresh();
    
    // Subscribe to network status updates
    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);
    
    // Set up app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Set up periodic refresh when offline
    const setupPeriodicRefresh = () => {
      if (!state.isConnected || !state.isInternetReachable) {
        reconnectTimeout.current = setTimeout(() => {
          refresh().finally(() => {
            setupPeriodicRefresh();
          });
        }, 10000); // Retry every 10 seconds when offline
      }
    };
    
    setupPeriodicRefresh();
    
    return () => {
      unsubscribe();
      subscription.remove();
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [handleAppStateChange, handleConnectivityChange, refresh, state.isConnected, state.isInternetReachable]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    ...state,
    refresh,
    isConnected: state.isConnected === true,
    isInternetReachable: state.isInternetReachable === true,
  }), [refresh, state]);

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export default NetworkProvider;
