import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type AuthContextType = {
  user: any;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        // First try to get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // If there's an error, try to refresh the session
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Error refreshing session:', refreshError);
            // If refresh fails, clear the session
            await supabase.auth.signOut();
            setUser(null);
          } else {
            setUser(refreshedSession?.user ?? null);
          }
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        // If any error occurs, ensure we're logged out
        await supabase.auth.signOut();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        switch (event) {
          case 'SIGNED_OUT':
            // Clear any existing tokens
            await supabase.auth.setSession({
              access_token: '',
              refresh_token: ''
            });
            setUser(null);
            break;
            
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            setUser(session?.user ?? null);
            break;
            
          case 'INITIAL_SESSION':
            // Handle initial session - no need to update user state here
            // as it's already handled by getSession()
            break;
            
          default:
            console.log('Unhandled auth event:', event);
        }
      }
    );
    
    // Initialize auth state
    initializeAuth();
    
    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // First try normal Supabase auth
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (!signInError && signInData?.user) {
        // Force a token refresh after successful login
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Error refreshing session after login:', refreshError);
          return { success: false, error: 'Failed to establish session' };
        }
        return { success: true };
      }

      // Fallback: invoke edge function to provision/login user if present in employees table
      try {
        const { data, error } = await supabase.functions.invoke('auth-user', {
          body: { email, password },
        });
        
        if (error) {
          return { success: false, error: error.message };
        }
        
        if (data?.session?.access_token && data?.session?.refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          
          if (setErr) {
            console.error('Error setting session:', setErr);
            return { success: false, error: setErr.message };
          }
          
          // Force a token refresh after setting the session
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('Error refreshing session after setSession:', refreshError);
            return { success: false, error: 'Failed to establish session' };
          }
          
          return { success: true };
        }
        
        return { success: false, error: 'Login failed: Invalid response from server' };
      } catch (e: any) {
        console.error('Error in login fallback:', e);
        return { success: false, error: e?.message || 'Login failed' };
      }
    } catch (e: any) {
      console.error('Error in login:', e);
      return { success: false, error: e?.message || 'Login failed' };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    try {
      console.log('Starting logout process...');
      
      // First clear any stored tokens
      await supabase.auth.setSession({
        access_token: '',
        refresh_token: ''
      });
      
      // Then sign out from Supabase
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Error during sign out:', signOutError);
        // Even if there's an error, we should still reset the user state
        setUser(null);
        throw signOutError;
      }
      
      // Reset user state
      setUser(null);
      
      console.log('Logout successful');
      return { success: true };
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, we should still reset the user state
      setUser(null);
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}; 