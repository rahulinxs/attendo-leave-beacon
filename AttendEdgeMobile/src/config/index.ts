// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.attendease.com/v1';

// Authentication
const AUTH_CONFIG = {
  TOKEN_KEY: 'authToken',
  REFRESH_TOKEN_KEY: 'refreshToken',
  TOKEN_EXPIRY: 3600, // 1 hour in seconds
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_OFFLINE_MODE: true,
  ENABLE_BIOMETRICS: false, // Will be enabled after implementation
  ENABLE_PUSH_NOTIFICATIONS: false, // Will be enabled after implementation
};

// Storage Keys
export const STORAGE_KEYS = {
  ...AUTH_CONFIG,
  USER_PROFILE: 'userProfile',
  APP_SETTINGS: 'appSettings',
  LAST_SYNC: 'lastSyncTimestamp',
};

// API Endpoints
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/me',
  },
  ATTENDANCE: {
    CHECK_IN: '/attendance/check-in',
    CHECK_OUT: '/attendance/check-out',
    HISTORY: '/attendance/history',
    SUMMARY: '/attendance/summary',
  },
  LEAVE: {
    REQUESTS: '/leave/requests',
    BALANCE: '/leave/balance',
    TYPES: '/leave/types',
  },
  TEAM: {
    MEMBERS: '/team/members',
    ATTENDANCE: '/team/attendance',
  },
  USER: {
    PROFILE: '/user/profile',
    PREFERENCES: '/user/preferences',
  },
};

// Validation Rules
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL_CHAR: true,
  },
  EMAIL: {
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

export default {
  API_BASE_URL,
  AUTH_CONFIG,
  FEATURE_FLAGS,
  STORAGE_KEYS,
  ENDPOINTS,
  VALIDATION,
};
