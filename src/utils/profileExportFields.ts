export type ProfileExportField = {
  key: string;
  label: string;
  group: string;
  source: 'employee' | 'profile';
  column: string;
  superAdminOnly?: boolean;
};

export const PROFILE_EXPORT_FIELDS: ProfileExportField[] = [
  { key: 'emp.name', label: 'Name', group: 'Employee', source: 'employee', column: 'name' },
  { key: 'emp.email', label: 'Work Email', group: 'Employee', source: 'employee', column: 'email' },
  { key: 'emp.role', label: 'Role', group: 'Employee', source: 'employee', column: 'role' },
  { key: 'emp.is_active', label: 'Account Status', group: 'Employee', source: 'employee', column: 'is_active' },
  { key: 'emp.hire_date', label: 'Hire Date', group: 'Employee', source: 'employee', column: 'hire_date' },
  { key: 'emp.department', label: 'Department (Employee)', group: 'Employee', source: 'employee', column: 'department' },
  { key: 'emp.position', label: 'Position', group: 'Employee', source: 'employee', column: 'position' },
  { key: 'emp.work_location', label: 'Work Location (Employee)', group: 'Employee', source: 'employee', column: 'work_location' },

  { key: 'profile.employee_code', label: 'Employee Code', group: 'Work', source: 'profile', column: 'employee_code' },
  { key: 'profile.date_of_joining', label: 'Date of Joining', group: 'Work', source: 'profile', column: 'date_of_joining' },
  { key: 'profile.designation', label: 'Designation', group: 'Work', source: 'profile', column: 'designation' },
  { key: 'profile.job_title', label: 'Job Title', group: 'Work', source: 'profile', column: 'job_title' },
  { key: 'profile.department', label: 'Department (Profile)', group: 'Work', source: 'profile', column: 'department' },
  { key: 'profile.sub_department', label: 'Sub Department', group: 'Work', source: 'profile', column: 'sub_department' },
  { key: 'profile.work_location', label: 'Work Location (Profile)', group: 'Work', source: 'profile', column: 'work_location' },
  { key: 'profile.employee_type', label: 'Employee Type', group: 'Work', source: 'profile', column: 'employee_type' },
  { key: 'profile.probation_period', label: 'Probation Period (months)', group: 'Work', source: 'profile', column: 'probation_period' },
  { key: 'profile.probation_status', label: 'Probation Status', group: 'Work', source: 'profile', column: 'probation_status' },
  { key: 'profile.work_experience_years', label: 'Work Experience (years)', group: 'Work', source: 'profile', column: 'work_experience_years' },
  { key: 'profile.id_card_issued', label: 'ID Card Issued', group: 'Work', source: 'profile', column: 'id_card_issued' },
  { key: 'profile.visiting_card_issued', label: 'Visiting Card Issued', group: 'Work', source: 'profile', column: 'visiting_card_issued' },

  { key: 'profile.employment_status', label: 'Employment Status', group: 'Employment', source: 'profile', column: 'employment_status' },
  { key: 'profile.last_working_day', label: 'Last Working Day', group: 'Employment', source: 'profile', column: 'last_working_day' },
  { key: 'profile.billing_status', label: 'Billing Status', group: 'Employment', source: 'profile', column: 'billing_status' },
  { key: 'profile.contract_valid_upto', label: 'Contract Valid Upto', group: 'Employment', source: 'profile', column: 'contract_valid_upto' },

  { key: 'profile.date_of_birth', label: 'Date of Birth', group: 'Personal', source: 'profile', column: 'date_of_birth' },
  { key: 'profile.gender', label: 'Gender', group: 'Personal', source: 'profile', column: 'gender' },
  { key: 'profile.blood_group', label: 'Blood Group', group: 'Personal', source: 'profile', column: 'blood_group' },
  { key: 'profile.marital_status', label: 'Marital Status', group: 'Personal', source: 'profile', column: 'marital_status' },
  { key: 'profile.marriage_anniversary', label: 'Marriage Anniversary', group: 'Personal', source: 'profile', column: 'marriage_anniversary' },

  { key: 'profile.personal_email', label: 'Personal Email', group: 'Contact', source: 'profile', column: 'personal_email' },
  { key: 'profile.phone_number', label: 'Phone Number', group: 'Contact', source: 'profile', column: 'phone_number' },
  { key: 'profile.alternate_phone_number', label: 'Alternate Phone', group: 'Contact', source: 'profile', column: 'alternate_phone_number' },
  { key: 'profile.social_profiles', label: 'Social Profiles', group: 'Contact', source: 'profile', column: 'social_profiles' },

  { key: 'profile.current_address', label: 'Current Address', group: 'Address', source: 'profile', column: 'current_address' },
  { key: 'profile.permanent_address', label: 'Permanent Address', group: 'Address', source: 'profile', column: 'permanent_address' },
  { key: 'profile.house_type', label: 'House Type', group: 'Address', source: 'profile', column: 'house_type' },
  { key: 'profile.residing_since', label: 'Residing Since', group: 'Address', source: 'profile', column: 'residing_since' },
  { key: 'profile.living_in_city_since', label: 'Living in City Since', group: 'Address', source: 'profile', column: 'living_in_city_since' },

  { key: 'profile.education_history', label: 'Education History', group: 'History', source: 'profile', column: 'education_history' },
  { key: 'profile.work_history', label: 'Work History', group: 'History', source: 'profile', column: 'work_history' },
  { key: 'profile.family_members', label: 'Family Members', group: 'History', source: 'profile', column: 'family_members' },
  { key: 'profile.emergency_contacts', label: 'Emergency Contacts', group: 'History', source: 'profile', column: 'emergency_contacts' },

  { key: 'profile.annual_ctc', label: 'Annual CTC', group: 'Compensation', source: 'profile', column: 'annual_ctc', superAdminOnly: true },
  { key: 'profile.aadhaar_number', label: 'Aadhaar Number', group: 'Identity', source: 'profile', column: 'aadhaar_number', superAdminOnly: true },
  { key: 'profile.pan_number', label: 'PAN Number', group: 'Identity', source: 'profile', column: 'pan_number', superAdminOnly: true },
  { key: 'profile.uan_number', label: 'UAN Number', group: 'Identity', source: 'profile', column: 'uan_number', superAdminOnly: true },
  { key: 'profile.pf_number', label: 'PF Number', group: 'Identity', source: 'profile', column: 'pf_number', superAdminOnly: true },
  { key: 'profile.esi_number', label: 'ESI Number', group: 'Identity', source: 'profile', column: 'esi_number', superAdminOnly: true },
  { key: 'profile.bank_name', label: 'Bank Name', group: 'Bank', source: 'profile', column: 'bank_name', superAdminOnly: true },
  { key: 'profile.bank_branch', label: 'Bank Branch', group: 'Bank', source: 'profile', column: 'bank_branch', superAdminOnly: true },
  { key: 'profile.bank_city', label: 'Bank City', group: 'Bank', source: 'profile', column: 'bank_city', superAdminOnly: true },
  { key: 'profile.ifsc_code', label: 'IFSC Code', group: 'Bank', source: 'profile', column: 'ifsc_code', superAdminOnly: true },
  { key: 'profile.account_number', label: 'Account Number', group: 'Bank', source: 'profile', column: 'account_number', superAdminOnly: true },
];

export const DEFAULT_PROFILE_EXPORT_KEYS = [
  'emp.name',
  'emp.email',
  'emp.role',
  'emp.department',
  'emp.work_location',
  'profile.designation',
  'profile.employment_status',
  'profile.phone_number',
];

export function getExportableFields(role?: string | null): ProfileExportField[] {
  return PROFILE_EXPORT_FIELDS.filter((field) => !field.superAdminOnly || role === 'super_admin');
}

export function formatExportValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}
