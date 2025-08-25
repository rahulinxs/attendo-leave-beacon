import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage utility for handling AsyncStorage operations
 */

type StorageValue = string | boolean | number | object | null;

const storage = {
  /**
   * Get an item from storage
   */
  async getItem<T extends StorageValue>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      
      // Try to parse JSON, if it fails return as string
      try {
        return JSON.parse(value) as T;
      } catch (e) {
        return value as unknown as T;
      }
    } catch (error) {
      console.error(`Error getting item ${key} from storage:`, error);
      return null;
    }
  },

  /**
   * Set an item in storage
   */
  async setItem(key: string, value: StorageValue): Promise<boolean> {
    try {
      const item = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, item);
      return true;
    } catch (error) {
      console.error(`Error setting item ${key} in storage:`, error);
      return false;
    }
  },

  /**
   * Remove an item from storage
   */
  async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item ${key} from storage:`, error);
      return false;
    }
  },

  /**
   * Clear all items from storage
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  /**
   * Get multiple items from storage
   */
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('Error getting multiple items from storage:', error);
      return keys.map(key => [key, null]);
    }
  },

  /**
   * Set multiple items in storage
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<boolean> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
      return true;
    } catch (error) {
      console.error('Error setting multiple items in storage:', error);
      return false;
    }
  },

  /**
   * Remove multiple items from storage
   */
  async multiRemove(keys: string[]): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Error removing multiple items from storage:', error);
      return false;
    }
  },
};

export default storage;
