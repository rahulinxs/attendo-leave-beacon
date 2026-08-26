import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdminRecordLocked } from '@/utils/employeePermissions';

// Define the types for our new data structures
export interface EmployeeProfile {
  id: string;
  employee_id: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  personal_email?: string;
  phone_number?: string;
  blood_group?: string;
  marriage_anniversary?: string;
  alternate_phone_number?: string;
  current_address?: string;
  permanent_address?: string;
  house_type?: string;
  residing_since?: string;
  living_in_city_since?: string;
  social_profiles?: any;
  employee_code?: string;
  date_of_joining?: string;
  probation_period?: number | null;
  employee_type?: string;
  work_location?: string;
  probation_status?: string;
  work_experience_years?: number | null;
  designation?: string;
  job_title?: string;
  department?: string;
  sub_department?: string;
  work_history?: any;
  education_history?: any;
  family_members?: any;
  emergency_contacts?: any;
  employment_status?: string;
  last_working_day?: string;
  billing_status?: string;
  contract_valid_upto?: string;
  annual_ctc?: number | null;
  aadhaar_number?: string;
  pan_number?: string;
  uan_number?: string;
  pf_number?: string;
  esi_number?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_city?: string;
  ifsc_code?: string;
  account_number?: string;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

export interface FullUserProfile {
  employee: any;
  profile: EmployeeProfile | null;
  documents: EmployeeDocument[];
}

export const useUserProfile = (employeeId: string) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<FullUserProfile | null>(null);

  const fetchUserProfile = async () => {
    if (!employeeId) return;
    setLoading(true);
    // Fetch employee
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle();
    // Fetch profile
    const { data: profile, error: profError } = await supabase
      .from('employee_profiles')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    // Fetch documents
    const { data: documents, error: docError } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false });
    setProfileData({
      employee,
      profile,
      documents: documents || [],
    });
    setLoading(false);
  };

  const assertCanEditRecord = async () => {
    const { data } = await supabase
      .from('employees')
      .select('role')
      .eq('id', employeeId)
      .maybeSingle();
    if (isSuperAdminRecordLocked(user?.role, data?.role)) {
      return 'Only a Super Admin can edit Super Admin employee records';
    }
    return null;
  };

  const updateUserProfile = async (profileUpdate: Partial<EmployeeProfile>) => {
    const blocked = await assertCanEditRecord();
    if (blocked) {
      console.error(blocked);
      return;
    }
    setLoading(true);
    // Convert string fields to numbers if present
    const update: any = { ...profileUpdate };
    if (typeof update.probation_period === 'string') {
      update.probation_period = update.probation_period ? parseInt(update.probation_period, 10) : null;
    }
    if (typeof update.work_experience_years === 'string') {
      update.work_experience_years = update.work_experience_years ? parseInt(update.work_experience_years, 10) : null;
    }
    // Convert empty string date fields to null
    if (typeof update.annual_ctc === 'string') {
      update.annual_ctc = update.annual_ctc ? parseFloat(update.annual_ctc) : null;
    }
    const dateFields = [
      'date_of_birth',
      'marriage_anniversary',
      'residing_since',
      'living_in_city_since',
      'date_of_joining',
      'last_working_day',
      'contract_valid_upto'
    ];
    dateFields.forEach(field => {
      if (update[field] === '') {
        update[field] = null;
      }
    });
    const isHrAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const sensitiveFields = [
      'annual_ctc', 'aadhaar_number', 'pan_number', 'uan_number', 'pf_number', 'esi_number',
      'bank_name', 'bank_branch', 'bank_city', 'ifsc_code', 'account_number',
      'employment_status', 'last_working_day', 'billing_status', 'contract_valid_upto',
      'employee_code', 'date_of_joining', 'probation_period', 'employee_type',
      'work_location', 'probation_status', 'designation', 'job_title', 'department', 'sub_department'
    ];
    if (!isHrAdmin) {
      sensitiveFields.forEach((field) => {
        delete update[field];
      });
    }
    // Parse JSON string fields to arrays if needed
    ['work_history', 'education_history', 'family_members', 'emergency_contacts'].forEach(field => {
      if (typeof update[field] === 'string') {
        try {
          update[field] = update[field] ? JSON.parse(update[field]) : [];
        } catch {
          update[field] = [];
        }
      }
    });
    // Check if profile exists
    const { data: existing, error: fetchError } = await supabase
      .from('employee_profiles')
      .select('id')
      .eq('employee_id', employeeId)
      .maybeSingle();
    let error;
    if (existing) {
      ({ error } = await supabase
        .from('employee_profiles')
        .update(update)
        .eq('employee_id', employeeId));
    } else {
      ({ error } = await supabase
        .from('employee_profiles')
        .insert({ employee_id: employeeId, ...update }));
    }
    if (error) {
      console.error('Error updating profile:', error);
    } else {
      if (isHrAdmin) {
        const employeePatch: Record<string, any> = {};
        if (update.date_of_joining !== undefined) employeePatch.hire_date = update.date_of_joining;
        if (update.department !== undefined) employeePatch.department = update.department;
        if (update.designation !== undefined) employeePatch.position = update.designation;
        if (update.work_location !== undefined) employeePatch.work_location = update.work_location || null;
        if (Object.keys(employeePatch).length > 0) {
          await supabase.from('employees').update(employeePatch).eq('id', employeeId);
        }
      }
      await fetchUserProfile();
    }
    setLoading(false);
  };

  const uploadDocument = async (file: File, documentType: string) => {
    if (!user) return;
    const blocked = await assertCanEditRecord();
    if (blocked) {
      alert(blocked);
      return;
    }
    setLoading(true);
    const filePath = `${employeeId}/${Date.now()}_${file.name}`;
    // Debug logs for RLS troubleshooting
    console.log('Auth user id:', user.id);
    console.log('employeeId used for document:', employeeId);
    // 1. Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('employee-documents')
      .upload(filePath, file);
    if (uploadError) {
      alert('Error uploading file: ' + uploadError.message);
      setLoading(false);
      return;
    }
    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from('employee-documents')
      .getPublicUrl(filePath);
    // 3. Save metadata to database
    const { error: dbError } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: employeeId,
        document_type: documentType,
        file_url: urlData.publicUrl,
        uploaded_by: user.id
      });
    if (dbError) {
      alert('Error saving document metadata: ' + dbError.message);
    } else {
      await fetchUserProfile();
    }
    setLoading(false);
  };

  const uploadAvatar = async (file: File): Promise<{ error?: string }> => {
    if (!employeeId) return { error: 'Missing employee' };
    const blocked = await assertCanEditRecord();
    if (blocked) return { error: blocked };
    if (!file.type.startsWith('image/')) {
      return { error: 'Please choose an image file (JPG, PNG, or WebP).' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'Image must be 5 MB or smaller.' };
    }

    const previousUrl = profileData?.employee?.avatar_url as string | undefined;

    // New object every time so replace does not depend on storage upsert/update rights.
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const filePath = `employee-avatars/${employeeId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('company-document')
      .upload(filePath, file, { upsert: false, contentType: file.type, cacheControl: '0' });
    if (uploadError) {
      return { error: uploadError.message || 'Failed to upload photo' };
    }
    const { data: urlData } = supabase.storage.from('company-document').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) {
      return { error: 'Failed to get photo URL' };
    }
    const { error: updateError } = await supabase
      .from('employees')
      .update({ avatar_url: publicUrl })
      .eq('id', employeeId);
    if (updateError) {
      return { error: updateError.message || 'Failed to save photo' };
    }

    if (previousUrl) {
      const marker = '/company-document/';
      const markerIndex = previousUrl.indexOf(marker);
      if (markerIndex !== -1) {
        const oldPath = decodeURIComponent(previousUrl.slice(markerIndex + marker.length).split('?')[0]);
        if (oldPath.startsWith(`employee-avatars/${employeeId}`)) {
          await supabase.storage.from('company-document').remove([oldPath]);
        }
      }
    }

    await fetchUserProfile();
    return {};
  };

  return {
    loading,
    profileData,
    fetchUserProfile,
    updateUserProfile,
    uploadDocument,
    uploadAvatar,
  };
}; 