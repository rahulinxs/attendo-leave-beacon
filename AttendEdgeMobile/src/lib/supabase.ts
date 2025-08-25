import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize the Supabase client with the project URL and public anon key from the web app
const supabaseUrl = 'https://pntrnltwvclbdmsnxlpy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudHJubHR3dmNsYmRtc254bHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDU2NDEsImV4cCI6MjA2NDEyMTY0MX0.z8VSWJniNxqwiDmFEUmXCRDXisgjkZXqkYpzsQCy_us';

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for React Native
  },
});

// Helper function to get the current user
// This will be used throughout the app to check if a user is authenticated
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string, userData: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: userData.fullName,
        // Add any additional user data here
      },
    },
  });
  return { data, error };
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Reset password
export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://yourapp.com/update-password', // Replace with your app's password reset URL
  });
  return { data, error };
};

// Update user profile
export const updateProfile = async (updates: any) => {
  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  });
  return { data, error };
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: any) => {
  return supabase.auth.onAuthStateChange(callback);
};
