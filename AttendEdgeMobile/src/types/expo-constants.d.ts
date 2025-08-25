declare module 'expo-constants' {
  export interface ExpoConfig {
    version?: string;
    android?: {
      versionCode?: number;
    };
    ios?: {
      buildNumber?: string;
    };
    extra?: {
      [key: string]: any;
    };
  }

  interface Constants {
    expoConfig?: ExpoConfig;
    [key: string]: any;
  }

  const Constants: Constants;
  export default Constants;
}
