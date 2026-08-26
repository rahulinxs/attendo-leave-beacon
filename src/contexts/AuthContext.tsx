import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'employee' | 'reporting_manager' | 'admin' | 'super_admin';
  department?: string;
  position?: string;
  platform_super_admin?: boolean;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, role?: 'employee' | 'reporting_manager' | 'admin') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  isInitializing: boolean;
  signupWithCompany: (
    email: string,
    password: string,
    name: string,
    companyName: string,
    role?: 'employee' | 'admin'
  ) => Promise<{ success: boolean; error?: string }>;
  platform_super_admin?: boolean;
}

const hasStoredAuthToken = () => {
  try {
    return Object.keys(localStorage).some(
      (key) => key.startsWith('sb-') && key.includes('auth-token')
    );
  } catch {
    return false;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(hasStoredAuthToken);

  useEffect(() => {
    let cancelled = false;
    const finishInit = () => {
      if (!cancelled) {
        setIsInitializing(false);
        setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log('Auth state changed:', event, nextSession?.user?.id);
      setSession(nextSession);

      if (event === 'INITIAL_SESSION') {
        if (nextSession?.user) {
          setTimeout(() => {
            fetchUserProfile(nextSession.user.id).finally(finishInit);
          }, 0);
        } else {
          finishInit();
        }
        return;
      }

      if (event === 'SIGNED_IN' && nextSession?.user) {
        setTimeout(() => {
          fetchUserProfile(nextSession.user.id).finally(() => {
            if (!cancelled) setIsLoading(false);
          });
        }, 0);
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        return;
      }

      if (event === 'SIGNED_OUT' || !nextSession) {
        setUser(null);
        finishInit();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data: employeeData } = await supabase
        .from('employees')
        .select('role_id, role')
        .eq('id', userId)
        .single();

      console.log('Employee data from DB:', employeeData);

      let userRole = 'employee' as 'employee' | 'reporting_manager' | 'admin' | 'super_admin';

      if (employeeData?.role_id) {
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('name')
          .eq('id', employeeData.role_id)
          .single();

        console.log('Role data from DB:', roleData);
        console.log('Role error:', roleError);

        if (roleData) {
          userRole = roleData.name as 'employee' | 'reporting_manager' | 'admin' | 'super_admin';
        } else if (employeeData.role) {
          // Fallback to legacy role column if roles table query fails
          console.log('Using fallback role column:', employeeData.role);
          userRole = employeeData.role as 'employee' | 'reporting_manager' | 'admin' | 'super_admin';
        }
      } else if (employeeData?.role) {
        // Fallback to legacy role column if role_id is null
        console.log('Using fallback role column (no role_id):', employeeData.role);
        userRole = employeeData.role as 'employee' | 'reporting_manager' | 'admin' | 'super_admin';
      }

      // Get full employee data
      const { data: profile, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setIsLoading(false);
        return;
      }

      if (profile) {
        console.log('Profile fetched successfully:', profile);
        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: userRole,
          department: profile.department,
          position: profile.position,
          platform_super_admin: profile.platform_super_admin || false,
          avatar_url: profile.avatar_url || null,
        });
      } else {
        console.log('No profile found for user:', userId);
        // Don't automatically sign out - let user handle this
        // This prevents session clearing on page refresh
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('Attempting login for:', email);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id);
        // Don't call fetchUserProfile here - let the auth state change handle it
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signup = async (
    email: string, 
    password: string, 
    name: string, 
    role: 'employee' | 'reporting_manager' | 'admin' = 'employee'
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('Attempting signup for:', email);
    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role,
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('Signup successful for user:', data.user.id);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Signup failed' };
    } catch (error) {
      console.error('Signup error:', error);
      setIsLoading(false);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const refreshUser = async () => {
    const { data: { session: current } } = await supabase.auth.getSession();
    if (current?.user) {
      await fetchUserProfile(current.user.id);
    }
  };

  const logout = async () => {
    console.log('Logging out user');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    // Clear all localStorage and sessionStorage data related to the app
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key === 'selectedCompany') localStorage.removeItem(key);
    });
    sessionStorage.clear();
  };

  const signupWithCompany = async (
    email: string,
    password: string,
    name: string,
    companyName: string,
    role: 'employee' | 'admin' = 'admin'
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // 1. Create company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ name: companyName }])
        .select()
        .single();
      if (companyError || !companyData) {
        setIsLoading(false);
        return { success: false, error: companyError?.message || 'Failed to create company' };
      }
      // 2. Sign up user
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role,
          }
        }
      });
      if (authError || !authData.user) {
        setIsLoading(false);
        return { success: false, error: authError?.message || 'Failed to create user' };
      }
      // 3. Create employee profile
      const { error: profileError } = await supabase
        .from('employees')
        .insert([{
          id: authData.user.id,
          email,
          name,
          company_id: companyData.id,
          role,
        }]);
      if (profileError) {
        setIsLoading(false);
        return { success: false, error: profileError.message };
      }
      setIsLoading(false);
      return { success: true };
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, refreshUser, isLoading, isInitializing, signupWithCompany, platform_super_admin: user?.platform_super_admin || false }}>
      {children}
    </AuthContext.Provider>
  );
};
