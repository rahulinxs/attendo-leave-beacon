import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { UserProfile, Employee } from '../types';

export const useDetailedProfile = (userId?: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      
      // Fetch employee info if exists
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Employee info might not exist for all users
      if (employeeError && employeeError.code !== 'PGRST116') {
        console.warn('Error fetching employee info:', employeeError);
      }

      setProfile(profileData);
      setEmployeeInfo(employeeData || null);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) return { success: false, error: 'No user ID provided' };
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(prev => (prev ? { ...prev, ...data } : data));
      return { success: true, data };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update profile' 
      };
    } finally {
      setLoading(false);
    }
  };

  const updateEmployeeInfo = async (updates: Partial<Employee>) => {
    if (!employeeInfo?.id) return { success: false, error: 'No employee record found' };
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('employees')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeInfo.id)
        .select()
        .single();

      if (error) throw error;
      
      setEmployeeInfo(prev => (prev ? { ...prev, ...data } : data));
      return { success: true, data };
    } catch (err) {
      console.error('Error updating employee info:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update employee info' 
      };
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!userId) return { success: false, error: 'No user ID provided' };
    
    try {
      setLoading(true);
      
      // Convert the image to a blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Generate a unique filename
      const fileExt = uri.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update the profile with the new avatar URL
      return await updateProfile({ avatar_url: publicUrl });
    } catch (err) {
      console.error('Error uploading avatar:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to upload avatar' 
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    employeeInfo,
    loading,
    error,
    refreshing,
    refresh,
    updateProfile,
    updateEmployeeInfo,
    uploadAvatar,
  };
};
