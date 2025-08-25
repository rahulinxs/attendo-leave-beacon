// App Constants
export const APP_NAME = 'AttendEdge';
export const APP_VERSION = '1.0.0';

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_PROFILE: 'userProfile',
  APP_SETTINGS: 'appSettings',
  LAST_SYNC: 'lastSyncTimestamp',
};

// Task Names
export const TASKS = {
  SYNC_DATA: 'syncDataTask',
  LOCATION_TRACKING: 'locationTrackingTask',
};

// Background Task Names
export const LOCATION_TASK_NAME = 'background-location-task';
export const SYNC_TASK_NAME = 'background-sync-task';

// API Constants
export const API = {
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Location Constants
export const LOCATION = {
  ACCURACY: {
    HIGH: 50, // meters
    MEDIUM: 100, // meters
    LOW: 500, // meters
  },
  UPDATE_INTERVAL: 10000, // 10 seconds
  MAX_AGE: 60000, // 1 minute
  DISTANCE_FILTER: 10, // meters
};

// Notification Channels (Android)
export const NOTIFICATION_CHANNELS = {
  DEFAULT: 'default',
  URGENT: 'urgent',
  BACKGROUND: 'background',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  SERVER: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  UNKNOWN: 'An unknown error occurred. Please try again.',
};

// Form Validation
export const VALIDATION = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL_CHAR: true,
  },
  PHONE: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,3}[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,4}$/,
};

// Date/Time Formats
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm',
  DATE_TIME: 'YYYY-MM-DD HH:mm',
  DISPLAY_DATE: 'MMM D, YYYY',
  DISPLAY_TIME: 'h:mm A',
  DISPLAY_DATE_TIME: 'MMM D, YYYY h:mm A',
};

// App Settings
export const SETTINGS = {
  THEME: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
  },
  LANGUAGE: {
    EN: 'en',
    // Add other languages as needed
  },
};

export default {
  APP_NAME,
  APP_VERSION,
  STORAGE_KEYS,
  TASKS,
  LOCATION_TASK_NAME,
  SYNC_TASK_NAME,
  API,
  LOCATION,
  NOTIFICATION_CHANNELS,
  ERROR_MESSAGES,
  VALIDATION,
  DATE_FORMATS,
  SETTINGS,
};
