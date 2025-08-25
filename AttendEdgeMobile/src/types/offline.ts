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
