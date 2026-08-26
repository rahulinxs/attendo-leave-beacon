import { UserProfile } from '@/types/user';

export interface ProfileCompletionResult {
  percentage: number;
  completedSections: string[];
  missingSections: string[];
  totalFields: number;
  completedFields: number;
}

export const calculateProfileCompletion = (profileData: any): ProfileCompletionResult => {
  const completedSections: string[] = [];
  const missingSections: string[] = [];
  let completedFields = 0;
  let totalFields = 0;

  // Personal Information Fields (6 fields)
  const personalFields = [
    { field: 'date_of_birth', label: 'Date of Birth' },
    { field: 'gender', label: 'Gender' },
    { field: 'blood_group', label: 'Blood Group' },
    { field: 'marital_status', label: 'Marital Status' },
    { field: 'marriage_anniversary', label: 'Marriage Anniversary', conditional: (data: any) => data.marital_status === 'Married' }
  ];

  let personalCompleted = 0;
  let personalTotal = 0;
  personalFields.forEach(({ field, label, conditional }) => {
    personalTotal++;
    totalFields++;
    if (conditional) {
      if (conditional(profileData)) {
        totalFields++; // Add conditional field to total
        if (profileData[field]) {
          completedFields++;
          personalCompleted++;
        }
      }
    } else {
      if (profileData[field]) {
        completedFields++;
        personalCompleted++;
      }
    }
  });

  if (personalCompleted >= 3) { // At least 3 of 4 core personal fields
    completedSections.push('Personal Info');
  } else {
    missingSections.push('Personal Info');
  }

  // Contact Information Fields (8 fields)
  const contactFields = [
    { field: 'personal_email', label: 'Personal Email' },
    { field: 'phone_number', label: 'Phone Number' },
    { field: 'alternate_phone_number', label: 'Alternate Phone' },
    { field: 'current_address', label: 'Current Address' },
    { field: 'permanent_address', label: 'Permanent Address' },
    { field: 'house_type', label: 'House Type' },
    { field: 'residing_since', label: 'Residing Since' },
    { field: 'living_in_city_since', label: 'Living in City Since' }
  ];

  let contactCompleted = 0;
  contactFields.forEach(({ field }) => {
    totalFields++;
    if (profileData[field]) {
      completedFields++;
      contactCompleted++;
    }
  });

  if (contactCompleted >= 4) { // At least half of contact fields
    completedSections.push('Contact Info');
  } else {
    missingSections.push('Contact Info');
  }

  // Work Information Fields (8 fields)
  const workFields = [
    { field: 'employee_code', label: 'Employee Code' },
    { field: 'date_of_joining', label: 'Date of Joining' },
    { field: 'probation_period', label: 'Probation Period' },
    { field: 'employee_type', label: 'Employee Type' },
    { field: 'work_location', label: 'Work Location' },
    { field: 'probation_status', label: 'Probation Status' },
    { field: 'work_experience_years', label: 'Work Experience' },
    { field: 'designation', label: 'Designation' },
    { field: 'employment_status', label: 'Employment Status' }
  ];

  let workCompleted = 0;
  workFields.forEach(({ field }) => {
    totalFields++;
    if (profileData[field]) {
      completedFields++;
      workCompleted++;
    }
  });

  if (workCompleted >= 4) { // At least half of work fields
    completedSections.push('Work Info');
  } else {
    missingSections.push('Work Info');
  }

  // Social Media Fields (3 fields)
  const socialFields = ['linkedin', 'facebook', 'twitter'];
  let socialCompleted = 0;
  socialFields.forEach(social => {
    totalFields++;
    if (profileData.social_profiles?.[social]) {
      completedFields++;
      socialCompleted++;
    }
  });

  // Family & Emergency (2 JSON arrays)
  totalFields += 2;
  if (profileData.family_members && Array.isArray(profileData.family_members) && profileData.family_members.length > 0) {
    completedFields++;
  }
  if (profileData.emergency_contacts && Array.isArray(profileData.emergency_contacts) && profileData.emergency_contacts.length > 0) {
    completedFields++;
  }

  const hasFamilyData = (profileData.family_members && Array.isArray(profileData.family_members) && profileData.family_members.length > 0) ||
                       (profileData.emergency_contacts && Array.isArray(profileData.emergency_contacts) && profileData.emergency_contacts.length > 0);

  if (hasFamilyData) {
    completedSections.push('Family & Emergency');
  } else {
    missingSections.push('Family & Emergency');
  }

  const educationFilled = Array.isArray(profileData.education_history) && profileData.education_history.length > 0;
  const historyFilled = Array.isArray(profileData.work_history) && profileData.work_history.length > 0;
  totalFields += 2;
  if (educationFilled) completedFields++;
  if (historyFilled) completedFields++;
  if (educationFilled) completedSections.push('Education');
  else missingSections.push('Education');
  if (historyFilled) completedSections.push('Work History');
  else missingSections.push('Work History');

  const identityFields = ['aadhaar_number', 'pan_number', 'uan_number', 'pf_number', 'esi_number'];
  let identityDone = 0;
  identityFields.forEach((field) => {
    totalFields++;
    if (profileData[field]) {
      completedFields++;
      identityDone++;
    }
  });
  if (identityDone >= 2) completedSections.push('Identity & Statutory');
  else missingSections.push('Identity & Statutory');

  const bankFields = ['bank_name', 'ifsc_code', 'account_number'];
  let bankDone = 0;
  bankFields.forEach((field) => {
    totalFields++;
    if (profileData[field]) {
      completedFields++;
      bankDone++;
    }
  });
  if (bankDone >= 2) completedSections.push('Bank');
  else missingSections.push('Bank');

  // Documents (count from documents array)
  if (profileData.documents && Array.isArray(profileData.documents)) {
    totalFields += 1;
    if (profileData.documents.length > 0) {
      completedFields++;
      completedSections.push('Documents');
    } else {
      missingSections.push('Documents');
    }
  }

  const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  return {
    percentage,
    completedSections,
    missingSections,
    totalFields,
    completedFields
  };
};

export const getCompletionColor = (percentage: number): string => {
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-yellow-600';
  if (percentage >= 40) return 'text-orange-600';
  return 'text-red-600';
};

export const getCompletionBgColor = (percentage: number): string => {
  if (percentage >= 80) return 'bg-green-100';
  if (percentage >= 60) return 'bg-yellow-100';
  if (percentage >= 40) return 'bg-orange-100';
  return 'bg-red-100';
};

export const getCompletionProgressColor = (percentage: number): string => {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-yellow-500';
  if (percentage >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};
