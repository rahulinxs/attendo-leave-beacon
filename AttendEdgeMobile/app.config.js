export default {
  expo: {
    name: 'AttendEdge',
    slug: 'attendedge',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.nytp.attendease',
      buildNumber: '1.0.0',
      infoPlist: {
        NSCameraUsageDescription: 'This app uses the camera to scan QR codes and take profile pictures.',
        NSLocationWhenInUseUsageDescription: 'This app uses your location to record attendance and provide location-based features.',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'This app uses your location in the background for attendance tracking.',
        NSLocationAlwaysUsageDescription: 'This app uses your location in the background for attendance tracking.',
        NSPhotoLibraryUsageDescription: 'This app needs access to your photo library to upload profile pictures.',
        NSPhotoLibraryAddUsageDescription: 'This app needs permission to save photos to your photo library.'
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      },
      package: 'com.nytp.attendease',
      versionCode: 1,
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'RECEIVE_BOOT_COMPLETED',
        'WAKE_LOCK',
        'com.anddoes.launcher.permission.UPDATE_COUNT',
        'com.google.android.c2dm.permission.RECEIVE',
        'com.google.android.gms.permission.ACTIVITY_RECOGNITION',
        'com.htc.launcher.permission.READ_SETTINGS',
        'com.htc.launcher.permission.UPDATE_SHORTCUT',
        'com.majeur.launcher.permission.UPDATE_BADGE',
        'com.sec.android.provider.badge.permission.READ',
        'com.sec.android.provider.badge.permission.WRITE',
        'com.sonyericsson.home.permission.BROADCAST_BADGE'
      ]
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      eas: {
        projectId: 'your-project-id-here'
      },
      apiUrl: process.env.API_URL || 'https://api.attendease.com/v1',
      enableDebugLogs: process.env.ENABLE_DEBUG_LOGS === 'true' || false,
      environment: process.env.ENVIRONMENT || 'development',
      sentryDsn: process.env.SENTRY_DSN || ''
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow AttendEase to use your location for attendance tracking.'
        }
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#4CAF50',
          sounds: [
            './assets/notification-sound.wav'
          ]
        }
      ]
    ]
  }
};
