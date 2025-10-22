import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Initialize the Supabase client with your project's URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Create a custom storage adapter for expo-secure-store
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const TABLES = {
  PROFILES: 'profiles',
  ATTENDANCE: 'attendance',
  LEAVE_REQUESTS: 'leave_requests',
  LEAVE_TYPES: 'leave_types',
  HOLIDAYS: 'holidays',
  EMPLOYEES: 'employees',
  TEAMS: 'teams',
  TEAM_MEMBERS: 'team_members',
};

// Helper function to handle Supabase errors
const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase Error in ${context}:`, error);
  throw new Error(error.message || `An error occurred during ${context}`);
};

// Helper function to upload files to Supabase Storage
export const uploadFile = async (bucket: string, path: string, file: Blob) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'file upload');
  }
};

// Helper function to get public URL for a file
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  return data.publicUrl;
};

// Helper function to fetch data from a table with optional filters
export const fetchData = async (table: string, filters = {}) => {
  try {
    let query = supabase.from(table).select('*');
    
    // Apply filters if provided
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, `fetching data from ${table}`);
  }
};

// Helper function to insert data into a table
export const insertData = async (table: string, data: any) => {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select();

    if (error) throw error;
    return result?.[0];
  } catch (error) {
    handleSupabaseError(error, `inserting data into ${table}`);
  }
};

// Helper function to update data in a table
export const updateData = async (table: string, id: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error) {
    handleSupabaseError(error, `updating data in ${table}`);
  }
};

// Helper function to delete data from a table
export const deleteData = async (table: string, id: string) => {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `deleting data from ${table}`);
    return false;
  }
};
