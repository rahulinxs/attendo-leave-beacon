import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { storage } from '../utils/storage';
import { handleError } from '../utils/error';

// Types for offline queue
interface OfflineQueueItem {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

type OfflineAction = {
  type: string;
  payload: any;
  meta?: {
    offline?: {
      effect: any;
      commit?: { type: string; meta?: any };
      rollback?: { type: string; meta?: any; error: any };
    };
  };
};

interface OfflineState {
  isConnected: boolean | null;
  isReconnecting: boolean;
  queue: OfflineQueueItem[];
  isSynchronizing: boolean;
  lastSynchronized: Date | null;
}

interface OfflineContextType extends OfflineState {
  enqueue: (action: OfflineAction) => Promise<string>;
  removeFromQueue: (id: string) => Promise<void>;
  retryAll: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
}

// Create context
const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

// Storage keys
const OFFLINE_QUEUE_KEY = '@offline_queue';
const LAST_SYNC_KEY = '@last_sync';

// Maximum number of retries for failed requests
const MAX_RETRIES = 3;

// Delay between retries in milliseconds
const RETRY_DELAY = 5000;

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<OfflineState>({
    isConnected: true, // Assume connected by default
    isReconnecting: false,
    queue: [],
    isSynchronizing: false,
    lastSynchronized: null,
  });

  // Load queue from storage on mount
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const [savedQueue, lastSync] = await Promise.all([
          storage.getItem<OfflineQueueItem[]>(OFFLINE_QUEUE_KEY) || [],
          storage.getItem<number>(LAST_SYNC_KEY),
        ]);

        setState(prev => ({
          ...prev,
          queue: Array.isArray(savedQueue) ? savedQueue : [],
          lastSynchronized: lastSync ? new Date(lastSync) : null,
        }));
      } catch (error) {
        console.error('Failed to load offline queue:', error);
      }
    };

    loadQueue();
  }, []);

  // Save queue to storage whenever it changes
  useEffect(() => {
    if (state.queue.length > 0) {
      storage.setItem(OFFLINE_QUEUE_KEY, state.queue);
    }
  }, [state.queue]);

  // Set up network status listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);
    return () => unsubscribe();
  }, []);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Handle network connectivity changes
  const handleConnectivityChange = (netState: NetInfoState) => {
    const isConnected = netState.isConnected && netState.isInternetReachable;
    
    setState(prev => ({
      ...prev,
      isConnected,
      isReconnecting: false,
    }));

    // If we just came back online, try to sync
    if (isConnected && !prevState?.isConnected) {
      syncQueue();
    }
  };

  // Handle app state changes (foreground/background)
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to the foreground, check connectivity
      const netState = await NetInfo.fetch();
      handleConnectivityChange(netState);
    }
  };

  // Add an action to the queue
  const enqueue = useCallback(async (action: OfflineAction): Promise<string> => {
    if (!action.meta?.offline) {
      throw new Error('Action must have an offline effect');
    }

    const id = Date.now().toString();
    const queueItem: OfflineQueueItem = {
      id,
      type: action.type,
      payload: action.payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
    };

    setState(prev => ({
      ...prev,
      queue: [...prev.queue, queueItem],
    }));

    // If online, try to process immediately
    if (state.isConnected) {
      processQueueItem(queueItem);
    }

    return id;
  }, [state.isConnected]);

  // Process a single queue item
  const processQueueItem = useCallback(async (item: OfflineQueueItem) => {
    if (!state.isConnected) return;

    try {
      setState(prev => ({
        ...prev,
        isSynchronizing: true,
      }));

      // Execute the effect
      await item.payload.meta.offline.effect();

      // If successful, remove from queue
      await removeFromQueue(item.id);

      // Update last sync time
      const now = new Date();
      await storage.setItem(LAST_SYNC_KEY, now.getTime());

      setState(prev => ({
        ...prev,
        lastSynchronized: now,
      }));
    } catch (error) {
      console.error('Error processing queue item:', error);
      
      // Increment retry count
      const updatedQueue = state.queue.map(qItem => {
        if (qItem.id === item.id) {
          return {
            ...qItem,
            retryCount: qItem.retryCount + 1,
          };
        }
        return qItem;
      });

      setState(prev => ({
        ...prev,
        queue: updatedQueue,
      }));

      // If we haven't exceeded max retries, schedule a retry
      if (item.retryCount < item.maxRetries) {
        setTimeout(() => processQueueItem(item), RETRY_DELAY);
      } else {
        // Max retries exceeded, show error
        Alert.alert(
          'Sync Error',
          `Failed to sync ${item.type} after ${item.maxRetries} attempts. Please try again later.`,
          [
            {
              text: 'Retry Now',
              onPress: () => processQueueItem(item),
            },
            {
              text: 'Dismiss',
              style: 'cancel',
            },
          ]
        );
      }
    } finally {
      setState(prev => ({
        ...prev,
        isSynchronizing: false,
      }));
    }
  }, [state.queue, state.isConnected]);

  // Remove an item from the queue
  const removeFromQueue = useCallback(async (id: string) => {
    setState(prev => {
      const newQueue = prev.queue.filter(item => item.id !== id);
      // If queue is empty, remove from storage
      if (newQueue.length === 0) {
        storage.removeItem(OFFLINE_QUEUE_KEY);
      }
      return {
        ...prev,
        queue: newQueue,
      };
    });
  }, []);

  // Retry all failed items in the queue
  const retryAll = useCallback(async () => {
    if (!state.isConnected) {
      Alert.alert('Offline', 'You are currently offline. Please check your connection and try again.');
      return;
    }

    setState(prev => ({
      ...prev,
      isReconnecting: true,
    }));

    try {
      // Process each item in the queue
      await Promise.all(state.queue.map(item => processQueueItem(item)));
    } catch (error) {
      console.error('Error retrying all items:', error);
      throw error;
    } finally {
      setState(prev => ({
        ...prev,
        isReconnecting: false,
      }));
    }
  }, [state.queue, state.isConnected, processQueueItem]);

  // Retry a specific item in the queue
  const retryItem = useCallback(async (id: string) => {
    if (!state.isConnected) {
      Alert.alert('Offline', 'You are currently offline. Please check your connection and try again.');
      return;
    }

    const item = state.queue.find(q => q.id === id);
    if (!item) return;

    await processQueueItem(item);
  }, [state.queue, state.isConnected, processQueueItem]);

  // Clear the entire queue
  const clearQueue = useCallback(async () => {
    setState(prev => ({
      ...prev,
      queue: [],
    }));
    await storage.removeItem(OFFLINE_QUEUE_KEY);
  }, []);

  // Synchronize the queue when coming back online
  const syncQueue = useCallback(async () => {
    if (!state.isConnected || state.queue.length === 0) return;

    setState(prev => ({
      ...prev,
      isSynchronizing: true,
    }));

    try {
      // Process each item in the queue
      await Promise.all(state.queue.map(item => processQueueItem(item)));
    } catch (error) {
      console.error('Error syncing queue:', error);
    } finally {
      setState(prev => ({
        ...prev,
        isSynchronizing: false,
      }));
    }
  }, [state.queue, state.isConnected, processQueueItem]);

  return (
    <OfflineContext.Provider
      value={{
        ...state,
        enqueue,
        removeFromQueue,
        retryAll,
        retryItem,
        clearQueue,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

// Helper function to create offline actions
export const createOfflineAction = (
  type: string,
  payload: any,
  effect: () => Promise<any>,
  commit?: { type: string; meta?: any },
  rollback?: { type: string; meta?: any; error: any }
): OfflineAction => ({
  type,
  payload,
  meta: {
    offline: {
      effect,
      commit,
      rollback,
    },
  },
});

export default OfflineProvider;
