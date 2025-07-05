import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role?: string;
  department?: string;
  position?: string;
  hire_date?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  reporting_manager_id?: string;
  company_id?: string;
  role_id?: string;
  team_id?: string;
}

export interface ProfileData {
  profile?: Profile;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch profile data (use id column)
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('id, email, name, role, department, position, hire_date, is_active, created_at, updated_at, reporting_manager_id, company_id, role_id, team_id')
        .eq('id', user.id)
        .single();
      if (profError && profError.code !== 'PGRST116') setError(profError.message);
      setProfileData({ profile });
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateUserProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) setError(error.message);
      await fetchUserProfile();
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, fetchUserProfile]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  return { profileData, loading, error, fetchUserProfile, updateUserProfile };
} 