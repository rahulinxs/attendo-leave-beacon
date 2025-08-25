import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { QueueItem, OfflineQueue, StorageKeys } from '../types/offline';
import { STORAGE_KEYS } from '../config/constants';

const QUEUE_KEY = '@AttendEdge:offlineQueue';
const LAST_SYNC_KEY = '@AttendEdge:lastSync';

class OfflineService {
  private queue: OfflineQueue = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private syncListeners: Array<(isSyncing: boolean) => void> = [];

  constructor() {
    this.init();
  }

  /**
   * Initialize the offline service
   */
  private async init() {
    // Load the queue from storage
    await this.loadQueue();
    
    // Set up network status listener
    this.setupNetworkListener();
    
    // Initial network status check
    const state = await NetInfo.fetch();
    this.handleNetworkStateChange(state.isConnected ?? false);
  }

  /**
   * Set up network status listener
   */
  private setupNetworkListener() {
    return NetInfo.addEventListener(state => {
      this.handleNetworkStateChange(state.isConnected ?? false);
    });
  }

  /**
   * Handle network state changes
   */
  private handleNetworkStateChange(isConnected: boolean) {
    this.isOnline = isConnected;
    
    if (isConnected) {
      this.processQueue();
    }
  }

  /**
   * Add an operation to the offline queue
   */
  async enqueue(operation: QueueItem): Promise<void> {
    // Add to in-memory queue
    this.queue.push({
      ...operation,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    });

    // Persist the updated queue
    await this.persistQueue();

    // Try to process the queue if online
    if (this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Process the offline queue
   */
  private async processQueue() {
    // Don't process if already syncing or offline
    if (this.syncInProgress || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.notifySyncStatusChange(true);

    try {
      // Process each item in the queue
      for (let i = 0; i < this.queue.length; i++) {
        const item = this.queue[i];
        
        if (item.status === 'completed') {
          continue; // Skip already completed items
        }

        try {
          // Mark as in progress
          item.status = 'in-progress';
          await this.persistQueue();

          // Execute the operation
          await this.executeOperation(item);

          // Mark as completed
          item.status = 'completed';
          item.completedAt = new Date().toISOString();
          await this.persistQueue();
          
        } catch (error) {
          console.error('Failed to process queue item:', error);
          
          // Update retry count and status
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastError = error.message;
          item.status = 'pending'; // Will retry on next online
          
          if (item.retryCount > 3) {
            item.status = 'failed';
            item.error = 'Max retries exceeded';
          }
          
          await this.persistQueue();
          
          // Stop processing further items on error
          break;
        }
      }
      
      // Clean up completed items
      await this.cleanupQueue();
      
    } finally {
      this.syncInProgress = false;
      this.notifySyncStatusChange(false);
    }
  }

  /**
   * Execute a queued operation
   */
  private async executeOperation(item: QueueItem): Promise<void> {
    const { type, payload } = item;
    
    // Import API services dynamically to avoid circular dependencies
    const { attendanceService } = await import('./attendanceService');
    const { leaveService } = await import('./leaveService');
    const { teamService } = await import('./teamService');
    const { userService } = await import('./userService');

    switch (type) {
      case 'CHECK_IN':
        await attendanceService.checkIn(payload);
        break;
        
      case 'CHECK_OUT':
        await attendanceService.checkOut(payload);
        break;
        
      case 'CREATE_LEAVE_REQUEST':
        await leaveService.createLeaveRequest(payload);
        break;
        
      case 'UPDATE_LEAVE_REQUEST':
        await leaveService.updateLeaveRequest(item.id, payload);
        break;
        
      case 'CANCEL_LEAVE_REQUEST':
        await leaveService.cancelLeaveRequest(item.id);
        break;
        
      case 'UPDATE_PROFILE':
        await userService.updateProfile(payload);
        break;
        
      case 'UPDATE_TEAM_MEMBER':
        await teamService.updateTeamMemberRole(
          payload.teamId,
          payload.userId,
          payload.role
        );
        break;
        
      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }
  }

  /**
   * Clean up completed items from the queue
   */
  private async cleanupQueue() {
    // Keep only pending and in-progress items
    this.queue = this.queue.filter(
      item => item.status === 'pending' || item.status === 'in-progress'
    );
    
    await this.persistQueue();
  }

  /**
   * Get the current queue status
   */
  getQueueStatus() {
    return {
      pending: this.queue.filter(item => item.status === 'pending').length,
      inProgress: this.queue.filter(item => item.status === 'in-progress').length,
      completed: this.queue.filter(item => item.status === 'completed').length,
      failed: this.queue.filter(item => item.status === 'failed').length,
      total: this.queue.length,
      isOnline: this.isOnline,
      isSyncing: this.syncInProgress,
    };
  }

  /**
   * Add a sync status change listener
   */
  addSyncStatusListener(listener: (isSyncing: boolean) => void) {
    this.syncListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners of sync status changes
   */
  private notifySyncStatusChange(isSyncing: boolean) {
    this.syncListeners.forEach(listener => {
      try {
        listener(isSyncing);
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }

  /**
   * Load the queue from storage
   */
  private async loadQueue() {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Persist the queue to storage
   */
  private async persistQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }

  /**
   * Get the last sync timestamp
   */
  async getLastSyncTimestamp(): Promise<number | null> {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Failed to get last sync timestamp:', error);
      return null;
    }
  }

  /**
   * Update the last sync timestamp
   */
  async updateLastSyncTimestamp(timestamp: number = Date.now()): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp.toString());
    } catch (error) {
      console.error('Failed to update last sync timestamp:', error);
    }
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    try {
      // Clear the queue
      this.queue = [];
      await AsyncStorage.removeItem(QUEUE_KEY);
      
      // Clear other cached data
      const keys = await AsyncStorage.getAllKeys();
      const keysToKeep = [
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_PROFILE,
      ];
      
      const keysToRemove = keys.filter(key => !keysToKeep.includes(key));
      await AsyncStorage.multiRemove(keysToRemove);
      
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }
}

export const offlineService = new OfflineService();

// Types
export type OperationType = 
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'CREATE_LEAVE_REQUEST'
  | 'UPDATE_LEAVE_REQUEST'
  | 'CANCEL_LEAVE_REQUEST'
  | 'UPDATE_PROFILE'
  | 'UPDATE_TEAM_MEMBER';

export interface QueueItem {
  id: string;
  type: OperationType;
  payload: any;
  timestamp: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
  error?: string;
  completedAt?: string;
}

export type OfflineQueue = QueueItem[];

export interface StorageKeys {
  [key: string]: string;
}
