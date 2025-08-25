import React, { ReactNode, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AuthProvider } from './AuthProvider';
import { NetworkProvider } from './NetworkProvider';
import { NotificationProvider } from './NotificationProvider';
import { OfflineProvider } from './OfflineProvider';
import { LoadingProvider } from './LoadingProvider';
import { ToastProvider } from './ToastProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import { LogBox } from 'react-native';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage',
  'Require cycle:',
]);

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * AppProviders component that wraps the entire application with all necessary providers.
 * This helps keep the main App component clean and makes it easier to manage providers.
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  // Create a stable query client instance
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes (previously cacheTime in v4)
        refetchOnWindowFocus: false,
      },
    },
  }), []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <NetworkProvider>
                <AuthProvider>
                  <OfflineProvider>
                    <NotificationProvider>
                      <LoadingProvider>
                        <ToastProvider>
                          {children}
                        </ToastProvider>
                      </LoadingProvider>
                    </NotificationProvider>
                  </OfflineProvider>
                </AuthProvider>
              </NetworkProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default AppProviders;
