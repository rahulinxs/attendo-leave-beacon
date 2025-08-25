import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signUp: (email: string, password: string, userData: { fullName: string }) => Promise<{ user: User | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ data: any; error: AuthError | null }>;
  updateProfile: (updates: any) => Promise<{ data: any; error: AuthError | null }>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;

  // Check if there's an active session when the app loads
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      // First, try to get the session from AsyncStorage
      const sessionJson = await AsyncStorage.getItem('@supabase.auth.token');
      
      if (sessionJson) {
        const sessionData = JSON.parse(sessionJson);
        const { data: { session: currentSession } } = await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } else {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      // Clear invalid session
      await AsyncStorage.removeItem('@supabase.auth.token');
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up the auth state change listener
  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          // Navigate to home after sign in
          router.replace('/(tabs)');
        } else if (event === 'SIGNED_OUT') {
          // Navigate to auth after sign out
          router.replace('/(auth)/login');
        } else if (event === 'PASSWORD_RECOVERY') {
          // Handle password recovery
          Alert.alert('Password Recovery', 'You can now set a new password for your account.');
        } else if (event === 'USER_UPDATED') {
          // Handle user updates
          await checkSession();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Navigate to home after successful sign in
      router.replace('/(tabs)');
      
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        user: null, 
        error: error as AuthError 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, userData: { fullName: string }) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.fullName,
            ...userData,
          },
        },
      });
      return { user: data.user, error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Navigate to auth after sign out
      router.replace('/(auth)/login');
      
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      return { error: error as AuthError };
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'yourapp://reset-password',
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { 
        data: null, 
        error: error as AuthError 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (updates: any) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { 
        data: null, 
        error: error as AuthError 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh the current session
  const refreshSession = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      setSession(data.session);
      setUser(data.user);
    } catch (error) {
      console.error('Error refreshing session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    session,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
