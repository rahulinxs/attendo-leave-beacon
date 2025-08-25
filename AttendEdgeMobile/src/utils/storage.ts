import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { config } from './config';

// Keys that should be stored securely
const SECURE_KEYS = [
  'authToken',
  'refreshToken',
  'userCredentials',
  'biometricCredentials',
];

// Prefix for namespacing
const PREFIX = '@AttendEdge:';

/**
 * Get the storage key with prefix
 */
const getKey = (key: string): string => `${PREFIX}${key}`;

/**
 * Check if a key should be stored securely
 */
const isSecureKey = (key: string): boolean => {
  return SECURE_KEYS.some(secureKey => key === secureKey || key.endsWith(`:${secureKey}`));
};

/**
 * Set an item in storage
 */
export const setItem = async <T = string>(
  key: string,
  value: T,
  options: { secure?: boolean } = {}
): Promise<void> => {
  try {
    const storageKey = getKey(key);
    const shouldUseSecureStore = options.secure !== undefined 
      ? options.secure 
      : isSecureKey(key);
    
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (shouldUseSecureStore) {
      await SecureStore.setItemAsync(storageKey, stringValue);
    } else {
      await AsyncStorage.setItem(storageKey, stringValue);
    }
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error(`Error setting item ${key}:`, error);
    }
    throw error;
  }
};

/**
 * Get an item from storage
 */
export const getItem = async <T = string>(
  key: string,
  options: { secure?: boolean } = {}
): Promise<T | null> => {
  try {
    const storageKey = getKey(key);
    const shouldUseSecureStore = options.secure !== undefined 
      ? options.secure 
      : isSecureKey(key);
    
    let value: string | null = null;
    
    if (shouldUseSecureStore) {
      value = await SecureStore.getItemAsync(storageKey);
    } else {
      value = await AsyncStorage.getItem(storageKey);
    }
    
    if (value === null) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error(`Error getting item ${key}:`, error);
    }
    return null;
  }
};

/**
 * Remove an item from storage
 */
export const removeItem = async (
  key: string,
  options: { secure?: boolean } = {}
): Promise<void> => {
  try {
    const storageKey = getKey(key);
    const shouldUseSecureStore = options.secure !== undefined 
      ? options.secure 
      : isSecureKey(key);
    
    if (shouldUseSecureStore) {
      await SecureStore.deleteItemAsync(storageKey);
    } else {
      await AsyncStorage.removeItem(storageKey);
    }
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error(`Error removing item ${key}:`, error);
    }
    throw error;
  }
};

/**
 * Clear all items from storage
 */
export const clear = async (): Promise<void> => {
  try {
    // Clear secure storage
    await Promise.all(
      SECURE_KEYS.map(key => 
        SecureStore.deleteItemAsync(getKey(key))
      )
    );
    
    // Clear async storage
    const allKeys = await AsyncStorage.getAllKeys();
    const appKeys = allKeys.filter(key => key.startsWith(PREFIX));
    await AsyncStorage.multiRemove(appKeys);
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error('Error clearing storage:', error);
    }
    throw error;
  }
};

/**
 * Get multiple items from storage
 */
export const multiGet = async <T = any>(
  keys: string[],
  options: { secure?: boolean } = {}
): Promise<[string, T | null][]> => {
  try {
    // Separate secure and non-secure keys
    const secureKeys = keys.filter(key => 
      options.secure !== undefined ? options.secure : isSecureKey(key)
    );
    
    const nonSecureKeys = keys.filter(key => 
      options.secure !== undefined ? !options.secure : !isSecureKey(key)
    );
    
    // Get secure items
    const secureItems = await Promise.all(
      secureKeys.map(async key => {
        const value = await getItem<T>(key, { ...options, secure: true });
        return [key, value] as [string, T | null];
      })
    );
    
    // Get non-secure items in a single batch
    let nonSecureItems: [string, T | null][] = [];
    
    if (nonSecureKeys.length > 0) {
      const storageKeys = nonSecureKeys.map(getKey);
      const values = await AsyncStorage.multiGet(storageKeys);
      
      nonSecureItems = values.map(([storageKey, value]) => {
        const key = storageKey.substring(PREFIX.length);
        try {
          return [key, value ? JSON.parse(value) : null] as [string, T | null];
        } catch {
          return [key, (value as unknown) as T] as [string, T | null];
        }
      });
    }
    
    // Combine and return results in the original key order
    const allItems = [...secureItems, ...nonSecureItems];
    return keys.map(key => {
      const item = allItems.find(([k]) => k === key);
      return item || [key, null];
    });
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error('Error getting multiple items:', error);
    }
    throw error;
  }
};

/**
 * Set multiple items in storage
 */
export const multiSet = async (
  keyValuePairs: [string, any][],
  options: { secure?: boolean } = {}
): Promise<void> => {
  try {
    // Separate secure and non-secure items
    const secureItems = keyValuePairs.filter(([key]) => 
      options.secure !== undefined ? options.secure : isSecureKey(key)
    );
    
    const nonSecureItems = keyValuePairs.filter(([key]) => 
      options.secure !== undefined ? !options.secure : !isSecureKey(key)
    );
    
    // Set secure items
    await Promise.all(
      secureItems.map(([key, value]) => 
        setItem(key, value, { ...options, secure: true })
      )
    );
    
    // Set non-secure items in a single batch
    if (nonSecureItems.length > 0) {
      const storageKeyValuePairs = nonSecureItems.map(([key, value]) => {
        const storageKey = getKey(key);
        const stringValue = typeof value === 'string' 
          ? value 
          : JSON.stringify(value);
        return [storageKey, stringValue] as [string, string];
      });
      
      await AsyncStorage.multiSet(storageKeyValuePairs);
    }
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error('Error setting multiple items:', error);
    }
    throw error;
  }
};

/**
 * Remove multiple items from storage
 */
export const multiRemove = async (
  keys: string[],
  options: { secure?: boolean } = {}
): Promise<void> => {
  try {
    // Separate secure and non-secure keys
    const secureKeys = keys.filter(key => 
      options.secure !== undefined ? options.secure : isSecureKey(key)
    );
    
    const nonSecureKeys = keys.filter(key => 
      options.secure !== undefined ? !options.secure : !isSecureKey(key)
    );
    
    // Remove secure items
    await Promise.all(
      secureKeys.map(key => removeItem(key, { ...options, secure: true }))
    );
    
    // Remove non-secure items in a single batch
    if (nonSecureKeys.length > 0) {
      const storageKeys = nonSecureKeys.map(getKey);
      await AsyncStorage.multiRemove(storageKeys);
    }
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error('Error removing multiple items:', error);
    }
    throw error;
  }
};

/**
 * Get all keys in storage
 */
export const getAllKeys = async (): Promise<string[]> => {
  try {
    const [secureKeys, asyncKeys] = await Promise.all([
      // Get all secure keys (we can't list all, so we return the ones we know about)
      Promise.resolve(SECURE_KEYS.filter(key => 
        SecureStore.getItemAsync(getKey(key)) !== null
      )),
      
      // Get all async storage keys
      AsyncStorage.getAllKeys()
    ]);
    
    // Filter and remove prefix
    const appKeys = asyncKeys
      .filter(key => key.startsWith(PREFIX))
      .map(key => key.substring(PREFIX.length));
    
    // Combine and deduplicate
    return [...new Set([...secureKeys, ...appKeys])];
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error('Error getting all keys:', error);
    }
    return [];
  }
};

/**
 * Clear all storage (including secure storage)
 */
export const clearAll = async (): Promise<void> => {
  try {
    await Promise.all([
      // Clear secure storage
      ...SECURE_KEYS.map(key => SecureStore.deleteItemAsync(getKey(key))),
      
      // Clear async storage
      (async () => {
        const allKeys = await AsyncStorage.getAllKeys();
        const appKeys = allKeys.filter(key => key.startsWith(PREFIX));
        await AsyncStorage.multiRemove(appKeys);
      })(),
    ]);
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error('Error clearing all storage:', error);
    }
    throw error;
  }
};

/**
 * Check if a key exists in storage
 */
export const hasKey = async (key: string): Promise<boolean> => {
  try {
    if (isSecureKey(key)) {
      const value = await SecureStore.getItemAsync(getKey(key));
      return value !== null;
    } else {
      const keys = await AsyncStorage.getAllKeys();
      return keys.includes(getKey(key));
    }
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error(`Error checking if key exists (${key}):`, error);
    }
    return false;
  }
};

/**
 * Get the size of the storage used by the app
 */
export const getStorageSize = async (): Promise<number> => {
  if (Platform.OS === 'ios') {
    // On iOS, we can't get the actual size used by SecureStore
    // So we only calculate the size of AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(key => key.startsWith(PREFIX));
    const keyValuePairs = await AsyncStorage.multiGet(appKeys);
    
    return keyValuePairs.reduce((total, [key, value]) => {
      return total + (key?.length || 0) + (value?.length || 0);
    }, 0);
  } else {
    // On Android, we can't get the actual size used by either storage
    // So we return an estimate based on AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(key => key.startsWith(PREFIX));
    const keyValuePairs = await AsyncStorage.multiGet(appKeys);
    
    return keyValuePairs.reduce((total, [key, value]) => {
      return total + (key?.length || 0) + (value?.length || 0);
    }, 0);
  }
};

export default {
  setItem,
  getItem,
  removeItem,
  clear,
  multiGet,
  multiSet,
  multiRemove,
  getAllKeys,
  clearAll,
  hasKey,
  getStorageSize,
};
