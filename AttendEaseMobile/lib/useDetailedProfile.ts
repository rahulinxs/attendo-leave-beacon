import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export interface DetailedProfile {
  // Basic Profile Info
  id: string;
  email: string;
  name: string;
  role?: string;
  department?: string;
  position?: string;
  hire_date?: string;
  is_active?: boolean;
  company_id?: string;
  team_id?: string;
  reporting_manager_id?: string;
  
  // Employee Profile Details
  employee_profile?: {
    id?: string;
    employee_id?: string;
    // Personal Info
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    marital_status?: string;
    marriage_anniversary?: string;
    // Contact Info
    personal_email?: string;
    phone_number?: string;
    alternate_phone_number?: string;
    // Address Info
    current_address?: string;
    permanent_address?: string;
    house_type?: string;
    residing_since?: string;
    living_in_city_since?: string;
    // Social Profiles
    social_profiles?: {
      linkedin?: string;
      facebook?: string;
      twitter?: string;
    };
    // Stationery
    id_card_issued?: boolean;
    visiting_card_issued?: boolean;
    // Work Info
    employee_code?: string;
    date_of_joining?: string;
    probation_period?: number;
    employee_type?: string;
    work_location?: string;
    probation_status?: string;
    work_experience_years?: number;
    designation?: string;
    job_title?: string;
    sub_department?: string;
    // JSONB Fields
    work_history?: Array<{
      department: string;
      designation: string;
      from: string;
      to: string;
    }>;
    education_history?: Array<{
      degree: string;
      institution: string;
      year_of_completion: string;
    }>;
    family_members?: Array<{
      name: string;
      relationship: string;
      date_of_birth: string;
      is_dependent: boolean;
    }>;
    emergency_contacts?: Array<{
      name: string;
      relationship: string;
      phone_number: string;
    }>;
  };
}

export interface DetailedProfileData {
  profile?: DetailedProfile;
}

export function useDetailedProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<DetailedProfileData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetailedProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
      // Fetch basic profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id, email, name, role, department, position, hire_date, 
          is_active, company_id, team_id, reporting_manager_id,
          created_at, updated_at
        `)
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Fetch detailed employee profile data
      const { data: employeeProfile, error: employeeProfileError } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('employee_id', user.id)
        .single();

      if (employeeProfileError && employeeProfileError.code !== 'PGRST116') {
        console.warn('Employee profile not found, will create basic structure');
      }

      // Combine the data
      const combinedProfile: DetailedProfile = {
        ...profile,
        employee_profile: employeeProfile || {}
      };

      setProfileData({ profile: combinedProfile });
    } catch (err: any) {
      console.error('Error fetching detailed profile:', err);
      setError(err.message || 'Failed to fetch profile data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateBasicProfile = useCallback(async (updates: Partial<DetailedProfile>) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
      await fetchDetailedProfile();
    } catch (err: any) {
      console.error('Error updating basic profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }, [user, fetchDetailedProfile]);

  const updateEmployeeProfile = useCallback(async (updates: Partial<DetailedProfile['employee_profile']>) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
      // Check if employee profile exists
      const { data: existingProfile } = await supabase
        .from('employee_profiles')
        .select('id')
        .eq('employee_id', user.id)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('employee_profiles')
          .update(updates)
          .eq('employee_id', user.id);
          
        if (error) throw error;
      } else {
        // Create new employee profile
        const { error } = await supabase
          .from('employee_profiles')
          .insert({
            employee_id: user.id,
            ...updates
          });
          
        if (error) throw error;
      }
      
      await fetchDetailedProfile();
    } catch (err: any) {
      console.error('Error updating employee profile:', err);
      setError(err.message || 'Failed to update employee profile');
    } finally {
      setLoading(false);
    }
  }, [user, fetchDetailedProfile]);

  const updateFamilyMembers = useCallback(async (familyMembers: Array<any>) => {
    return updateEmployeeProfile({ family_members: familyMembers });
  }, [updateEmployeeProfile]);

  const updateEmergencyContacts = useCallback(async (emergencyContacts: Array<any>) => {
    return updateEmployeeProfile({ emergency_contacts: emergencyContacts });
  }, [updateEmployeeProfile]);

  useEffect(() => {
    fetchDetailedProfile();
  }, [fetchDetailedProfile]);

  return { 
    profileData, 
    loading, 
    error, 
    fetchDetailedProfile, 
    updateBasicProfile,
    updateEmployeeProfile,
    updateFamilyMembers,
    updateEmergencyContacts
  };
}
