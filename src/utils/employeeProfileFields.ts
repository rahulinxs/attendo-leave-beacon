export type EmployeeProfileFieldKey =
  | 'employee_id_card'
  | 'personal'
  | 'contact'
  | 'work'
  | 'family'
  | 'documents'
  | 'education'
  | 'work_history'
  | 'identity'
  | 'bank';

export type EmployeeProfileFieldDefinition = {
  key: EmployeeProfileFieldKey;
  label: string;
  description: string;
};

export const EMPLOYEE_PROFILE_FIELDS: EmployeeProfileFieldDefinition[] = [
  { key: 'employee_id_card', label: 'Employee ID Card', description: 'Employee ID card module and card details' },
  { key: 'personal', label: 'Personal information', description: 'Date of birth, gender, blood group, and marital status' },
  { key: 'contact', label: 'Contact information', description: 'Personal email, phone numbers, addresses, and social links' },
  { key: 'work', label: 'Work information', description: 'Employee code, role, department, location, and employment status' },
  { key: 'family', label: 'Family and emergency contacts', description: 'Family members and emergency contact details' },
  { key: 'documents', label: 'Documents', description: 'Uploaded employee documents' },
  { key: 'education', label: 'Education', description: 'Education and qualification history' },
  { key: 'work_history', label: 'Work history', description: 'Previous employment history' },
  { key: 'identity', label: 'Identity and statutory', description: 'Government and statutory identification numbers' },
  { key: 'bank', label: 'Bank and compensation', description: 'Bank account and annual compensation details' },
];

export const DEFAULT_EMPLOYEE_PROFILE_VISIBILITY: Record<EmployeeProfileFieldKey, boolean> =
  EMPLOYEE_PROFILE_FIELDS.reduce((visibility, field) => {
    visibility[field.key] = true;
    return visibility;
  }, {} as Record<EmployeeProfileFieldKey, boolean>);
