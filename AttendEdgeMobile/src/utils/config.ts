import Constants from 'expo-constants';

type Config = {
  API_URL: string;
  ENABLE_DEBUG_LOGS: boolean;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  SENTRY_DSN: string;
  GOOGLE_MAPS_API_KEY: string;
  ONE_SIGNAL_APP_ID: string;
  FEATURE_OFFLINE_MODE: boolean;
  FEATURE_BIOMETRIC_AUTH: boolean;
  FEATURE_PUSH_NOTIFICATIONS: boolean;
};

// Get config from app.json extra field
const extra = Constants.expoConfig?.extra || {};

// Default configuration values
const DEFAULT_CONFIG: Config = {
  API_URL: 'https://api.attendease.com/v1',
  ENABLE_DEBUG_LOGS: false,
  ENVIRONMENT: 'development',
  SENTRY_DSN: '',
  GOOGLE_MAPS_API_KEY: '',
  ONE_SIGNAL_APP_ID: '',
  FEATURE_OFFLINE_MODE: true,
  FEATURE_BIOMETRIC_AUTH: false,
  FEATURE_PUSH_NOTIFICATIONS: false,
};

// Merge default config with environment variables
const config: Config = {
  ...DEFAULT_CONFIG,
  ...Object.entries(extra).reduce((acc, [key, value]) => {
    // Convert string 'true'/'false' to boolean
    if (value === 'true') return { ...acc, [key]: true };
    if (value === 'false') return { ...acc, [key]: false };
    return { ...acc, [key]: value };
  }, {} as Partial<Config>),
};

// Validate required environment variables in production
if (config.ENVIRONMENT === 'production') {
  const requiredVars: (keyof Config)[] = [
    'API_URL',
    'SENTRY_DSN',
  ];

  const missingVars = requiredVars.filter(
    (key) => !config[key] && config[key] !== false
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

// Log config in development
if (config.ENVIRONMENT === 'development' && config.ENABLE_DEBUG_LOGS) {
  console.log('App Config:', {
    ...config,
    // Don't log sensitive values
    SENTRY_DSN: config.SENTRY_DSN ? '***' : '',
    GOOGLE_MAPS_API_KEY: config.GOOGLE_MAPS_API_KEY ? '***' : '',
    ONE_SIGNAL_APP_ID: config.ONE_SIGNAL_APP_ID ? '***' : '',
  });
}

export default config;
