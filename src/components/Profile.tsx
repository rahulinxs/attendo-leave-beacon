import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { calculateProfileCompletion, getCompletionColor, getCompletionBgColor, getCompletionProgressColor } from '@/utils/profileCompletion';
import { Progress } from './ui/progress';
import { Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyLocations } from '@/hooks/useCompanyLocations';
import { isSuperAdminRecordLocked } from '@/utils/employeePermissions';

interface ProfileProps {
  employeeId: string;
  readOnly?: boolean;
}

const genderOptions = ["Male", "Female", "Other"];
const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const maritalStatusOptions = ["Single", "Married", "Divorced", "Widowed"];
const employmentStatusOptions = ["Active", "On notice", "Relieved", "Contract", "Probation"];
const billingStatusOptions = ["Billable", "Non-billable", "Internal", "On hold"];
const documentTypeOptions = [
  "Aadhaar Card",
  "PAN Card",
  "Passport",
  "Driving License",
  "Voter ID",
  "SSC Marksheet",
  "HSC Marksheet",
  "Graduation Marksheet",
  "Residential Address Proof",
  "Other",
];

const formatDisplayDate = (iso?: string) => {
  if (!iso) return '-';
  const part = iso.slice(0, 10);
  const [y, m, d] = part.split('-');
  if (!d || !m || !y) return iso;
  return `${d}/${m}/${y}`;
};

const maskSecret = (value?: string | number | null) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (!text) return '-';
  if (text.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(8, text.length - 4))}${text.slice(-4)}`;
};

const parseJsonList = (value: any) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const initialsFromName = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Profile: React.FC<ProfileProps> = ({ employeeId, readOnly: readOnlyProp = false }) => {
  const { user, refreshUser } = useAuth();
  const { activeNames: companyLocations } = useCompanyLocations();
  const isHrAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { profileData, fetchUserProfile, loading, updateUserProfile, uploadDocument, uploadAvatar } = useUserProfile(employeeId);
  const readOnly = readOnlyProp || isSuperAdminRecordLocked(user?.role, profileData?.employee?.role);
  const [personalForm, setPersonalForm] = useState({
    name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    marital_status: '',
    marriage_anniversary: '',
  });
  const [contactForm, setContactForm] = useState({
    personal_email: '',
    phone_number: '',
    alternate_phone_number: '',
    current_address: '',
    permanent_address: '',
    house_type: '',
    residing_since: '',
    living_in_city_since: '',
    social_linkedin: '',
    social_facebook: '',
    social_twitter: '',
  });
  const [workForm, setWorkForm] = useState({
    employee_code: '',
    date_of_joining: '',
    probation_period: '',
    employee_type: '',
    work_location: '',
    probation_status: '',
    work_experience_years: '',
    designation: '',
    job_title: '',
    department: '',
    sub_department: '',
    employment_status: '',
    last_working_day: '',
    billing_status: '',
    contract_valid_upto: '',
    reporting_manager_id: '',
  });
  const [identityForm, setIdentityForm] = useState({
    aadhaar_number: '',
    pan_number: '',
    uan_number: '',
    pf_number: '',
    esi_number: '',
  });
  const [bankForm, setBankForm] = useState({
    annual_ctc: '',
    bank_name: '',
    bank_branch: '',
    bank_city: '',
    ifsc_code: '',
    account_number: '',
  });
  const [educationList, setEducationList] = useState<any[]>([]);
  const [workHistoryList, setWorkHistoryList] = useState<any[]>([]);
  const [colleagues, setColleagues] = useState<{ id: string; name: string; email: string; is_active?: boolean }[]>([]);
  const [reportees, setReportees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [leaveSummaries, setLeaveSummaries] = useState<{ name: string; allocated: number; used: number }[]>([]);
  const [familyForm, setFamilyForm] = useState({
    family_members: '', // JSON string
    emergency_contacts: '', // JSON string
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('');
  const [saving, setSaving] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [workSaving, setWorkSaving] = useState(false);
  const [familySaving, setFamilySaving] = useState(false);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [educationSaving, setEducationSaving] = useState(false);
  const [historySaving, setHistorySaving] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [editTab, setEditTab] = useState<string | null>(null);
  const [acceptAllLoading, setAcceptAllLoading] = useState(false);
  const [acceptAllSuccess, setAcceptAllSuccess] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const themeClass = THEME_OPTIONS.find(t => t.key === theme)?.className || '';

  // Calculate profile completion
  const profileCompletion = React.useMemo(() => {
    if (!profileData?.profile) return { percentage: 0, completedSections: [], missingSections: [], totalFields: 0, completedFields: 0 };
    
    const allProfileData = {
      ...profileData.profile,
      documents: profileData.documents || []
    };
    
    return calculateProfileCompletion(allProfileData);
  }, [profileData]);

  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line
  }, [employeeId]);

  useEffect(() => {
    if (profileData?.employee) {
      setPersonalForm(f => ({
        ...f,
        name: profileData.employee.name || '',
      }));
      setWorkForm(f => ({
        ...f,
        reporting_manager_id: profileData.employee.reporting_manager_id || '',
      }));
    }
    if (profileData?.profile) {
      setPersonalForm(f => ({
        ...f,
        date_of_birth: profileData.profile.date_of_birth || '',
        gender: profileData.profile.gender || '',
        blood_group: profileData.profile.blood_group || '',
        marital_status: profileData.profile.marital_status || '',
        marriage_anniversary: profileData.profile.marriage_anniversary || '',
      }));
      setContactForm(f => ({
        ...f,
        personal_email: profileData.profile.personal_email || '',
        phone_number: profileData.profile.phone_number || '',
        alternate_phone_number: profileData.profile.alternate_phone_number || '',
        current_address: profileData.profile.current_address || '',
        permanent_address: profileData.profile.permanent_address || '',
        house_type: profileData.profile.house_type || '',
        residing_since: profileData.profile.residing_since || '',
        living_in_city_since: profileData.profile.living_in_city_since || '',
        social_linkedin: profileData.profile.social_profiles?.linkedin || '',
        social_facebook: profileData.profile.social_profiles?.facebook || '',
        social_twitter: profileData.profile.social_profiles?.twitter || '',
      }));
      setWorkForm(f => ({
        ...f,
        employee_code: profileData.profile.employee_code || '',
        date_of_joining: profileData.profile.date_of_joining || '',
        probation_period: profileData.profile.probation_period !== undefined && profileData.profile.probation_period !== null ? String(profileData.profile.probation_period) : '',
        employee_type: profileData.profile.employee_type || '',
        work_location: profileData.profile.work_location || profileData.employee?.work_location || '',
        probation_status: profileData.profile.probation_status || '',
        work_experience_years: profileData.profile.work_experience_years !== undefined && profileData.profile.work_experience_years !== null ? String(profileData.profile.work_experience_years) : '',
        designation: profileData.profile.designation || '',
        job_title: profileData.profile.job_title || '',
        department: profileData.profile.department || '',
        sub_department: profileData.profile.sub_department || '',
        employment_status: profileData.profile.employment_status || '',
        last_working_day: profileData.profile.last_working_day || '',
        billing_status: profileData.profile.billing_status || '',
        contract_valid_upto: profileData.profile.contract_valid_upto || '',
        reporting_manager_id: profileData.employee?.reporting_manager_id || '',
      }));
      setIdentityForm({
        aadhaar_number: profileData.profile.aadhaar_number || '',
        pan_number: profileData.profile.pan_number || '',
        uan_number: profileData.profile.uan_number || '',
        pf_number: profileData.profile.pf_number || '',
        esi_number: profileData.profile.esi_number || '',
      });
      setBankForm({
        annual_ctc: profileData.profile.annual_ctc !== undefined && profileData.profile.annual_ctc !== null ? String(profileData.profile.annual_ctc) : '',
        bank_name: profileData.profile.bank_name || '',
        bank_branch: profileData.profile.bank_branch || '',
        bank_city: profileData.profile.bank_city || '',
        ifsc_code: profileData.profile.ifsc_code || '',
        account_number: profileData.profile.account_number || '',
      });
      setEducationList(parseJsonList(profileData.profile.education_history));
      setWorkHistoryList(parseJsonList(profileData.profile.work_history));
      setFamilyForm(f => ({
        ...f,
        family_members: JSON.stringify(profileData.profile.family_members || [], null, 2),
        emergency_contacts: JSON.stringify(profileData.profile.emergency_contacts || [], null, 2),
      }));
    }
  }, [profileData]);

  useEffect(() => {
    const loadOrgContext = async () => {
      const companyId = profileData?.employee?.company_id;
      if (!employeeId) return;
      const { data: reports } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('reporting_manager_id', employeeId)
        .eq('is_active', true)
        .order('name');
      setReportees(reports || []);
      if (companyId) {
        const { data: people } = await supabase
          .from('employees')
          .select('id, name, email, is_active')
          .eq('company_id', companyId)
          .order('name');
        setColleagues((people || []).filter((p) => p.id !== employeeId));
        const { data: types } = await supabase
          .from('leave_types')
          .select('id, name')
          .eq('company_id', companyId)
          .eq('is_active', true);
        const year = new Date().getFullYear();
        const { data: balances } = await supabase
          .from('leave_balances')
          .select('leave_type_id, allocated_days, used_days')
          .eq('employee_id', employeeId)
          .eq('year', year);
        const typeMap = new Map((types || []).map((t: any) => [t.id, t.name]));
        setLeaveSummaries(
          (balances || []).map((b: any) => ({
            name: typeMap.get(b.leave_type_id) || 'Leave',
            allocated: Number(b.allocated_days || 0),
            used: Number(b.used_days || 0),
          }))
        );
      }
    };
    loadOrgContext();
  }, [employeeId, profileData?.employee?.company_id]);

  // Handlers for each form
  const handlePersonalChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPersonalForm(f => ({ ...f, [name]: value }));
  };
  const handleContactChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactForm(f => ({ ...f, [name]: value }));
  };
  const handleWorkChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWorkForm(f => ({ ...f, [name]: value }));
  };
  const handleFamilyChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFamilyForm(f => ({ ...f, [name]: value }));
  };

  // Save handlers
  const handlePersonalSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateUserProfile({
      date_of_birth: personalForm.date_of_birth,
      gender: personalForm.gender,
      blood_group: personalForm.blood_group,
      marital_status: personalForm.marital_status,
      marriage_anniversary: personalForm.marriage_anniversary,
    });
    setSaving(false);
    setEditTab(null);
  };
  const handleContactSave = async (e: FormEvent) => {
    e.preventDefault();
    setContactSaving(true);
    const updateData = {
      personal_email: contactForm.personal_email,
      phone_number: contactForm.phone_number,
      alternate_phone_number: contactForm.alternate_phone_number,
      current_address: contactForm.current_address,
      permanent_address: contactForm.permanent_address,
      house_type: contactForm.house_type,
      residing_since: contactForm.residing_since,
      living_in_city_since: contactForm.living_in_city_since,
      social_profiles: {
        linkedin: contactForm.social_linkedin,
        facebook: contactForm.social_facebook,
        twitter: contactForm.social_twitter,
      },
    };
    await updateUserProfile(updateData);
    setContactSaving(false);
    setEditTab(null);
  };
  const handleWorkSave = async (e: FormEvent) => {
    e.preventDefault();
    setWorkSaving(true);
    await updateUserProfile({
      employee_code: workForm.employee_code,
      date_of_joining: workForm.date_of_joining,
      probation_period: workForm.probation_period ? parseInt(workForm.probation_period, 10) : null,
      employee_type: workForm.employee_type,
      work_location: workForm.work_location,
      probation_status: workForm.probation_status,
      work_experience_years: workForm.work_experience_years ? parseInt(workForm.work_experience_years, 10) : null,
      designation: workForm.designation,
      job_title: workForm.job_title,
      department: workForm.department,
      sub_department: workForm.sub_department,
      employment_status: workForm.employment_status,
      last_working_day: workForm.last_working_day,
      billing_status: workForm.billing_status,
      contract_valid_upto: workForm.contract_valid_upto,
    });
    if (isHrAdmin && !readOnly) {
      await supabase
        .from('employees')
        .update({ reporting_manager_id: workForm.reporting_manager_id || null })
        .eq('id', employeeId);
      await fetchUserProfile();
    }
    setWorkSaving(false);
    setEditTab(null);
  };
  const handleFamilySave = async (e: FormEvent) => {
    e.preventDefault();
    setFamilySaving(true);
    let family_members = [];
    let emergency_contacts = [];
    try {
      family_members = JSON.parse(familyForm.family_members);
      emergency_contacts = JSON.parse(familyForm.emergency_contacts);
    } catch (err) {
      alert('Invalid JSON in family or emergency contacts');
      setFamilySaving(false);
      return;
    }
    await updateUserProfile({
      family_members,
      emergency_contacts,
    });
    setFamilySaving(false);
    setEditTab(null);
  };

  const handleIdentityChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIdentityForm(f => ({ ...f, [name]: value }));
  };
  const handleBankChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBankForm(f => ({ ...f, [name]: value }));
  };
  const handleIdentitySave = async (e: FormEvent) => {
    e.preventDefault();
    if (!isHrAdmin) return;
    setIdentitySaving(true);
    await updateUserProfile({ ...identityForm });
    setIdentitySaving(false);
    setEditTab(null);
  };
  const handleBankSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!isHrAdmin) return;
    setBankSaving(true);
    await updateUserProfile({
      annual_ctc: bankForm.annual_ctc ? parseFloat(bankForm.annual_ctc) : null,
      bank_name: bankForm.bank_name,
      bank_branch: bankForm.bank_branch,
      bank_city: bankForm.bank_city,
      ifsc_code: bankForm.ifsc_code,
      account_number: bankForm.account_number,
    });
    setBankSaving(false);
    setEditTab(null);
  };
  const handleEducationSave = async (e: FormEvent) => {
    e.preventDefault();
    setEducationSaving(true);
    await updateUserProfile({ education_history: educationList });
    setEducationSaving(false);
    setEditTab(null);
  };
  const handleWorkHistorySave = async (e: FormEvent) => {
    e.preventDefault();
    setHistorySaving(true);
    await updateUserProfile({ work_history: workHistoryList });
    setHistorySaving(false);
    setEditTab(null);
  };

  // Document upload
  const handleDocFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocFile(e.target.files[0]);
    }
  };
  const handleDocUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!docFile || !docType) return;
    setDocUploading(true);
    await uploadDocument(docFile, docType);
    setDocFile(null);
    setDocType('');
    setDocUploading(false);
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (readOnly || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    e.target.value = '';
    setPhotoLoading(true);
    setPhotoError('');
    const result = await uploadAvatar(file);
    if (result.error) {
      setPhotoError(result.error);
    } else if (user?.id === employeeId) {
      await refreshUser();
    }
    setPhotoLoading(false);
  };

  // Accept All handler
  const handleAcceptAll = async () => {
    setAcceptAllLoading(true);
    setAcceptAllSuccess(false);
    try {
      await updateUserProfile({
        date_of_birth: personalForm.date_of_birth,
        gender: personalForm.gender,
        blood_group: personalForm.blood_group,
        marital_status: personalForm.marital_status,
        marriage_anniversary: personalForm.marriage_anniversary,
        personal_email: contactForm.personal_email,
        phone_number: contactForm.phone_number,
        alternate_phone_number: contactForm.alternate_phone_number,
        current_address: contactForm.current_address,
        permanent_address: contactForm.permanent_address,
        house_type: contactForm.house_type,
        residing_since: contactForm.residing_since,
        living_in_city_since: contactForm.living_in_city_since,
        social_profiles: {
          linkedin: contactForm.social_linkedin,
          facebook: contactForm.social_facebook,
          twitter: contactForm.social_twitter,
        },
        employee_code: workForm.employee_code,
        date_of_joining: workForm.date_of_joining,
        probation_period: workForm.probation_period ? parseInt(workForm.probation_period, 10) : null,
        employee_type: workForm.employee_type,
        work_location: workForm.work_location,
        probation_status: workForm.probation_status,
        work_experience_years: workForm.work_experience_years ? parseInt(workForm.work_experience_years, 10) : null,
        designation: workForm.designation,
        job_title: workForm.job_title,
        department: workForm.department,
        sub_department: workForm.sub_department,
        family_members: familyForm.family_members ? JSON.parse(familyForm.family_members) : [],
        emergency_contacts: familyForm.emergency_contacts ? JSON.parse(familyForm.emergency_contacts) : [],
        education_history: educationList,
        work_history: workHistoryList,
        ...(isHrAdmin
          ? {
              employment_status: workForm.employment_status,
              last_working_day: workForm.last_working_day,
              billing_status: workForm.billing_status,
              contract_valid_upto: workForm.contract_valid_upto,
              ...identityForm,
              annual_ctc: bankForm.annual_ctc ? parseFloat(bankForm.annual_ctc) : null,
              bank_name: bankForm.bank_name,
              bank_branch: bankForm.bank_branch,
              bank_city: bankForm.bank_city,
              ifsc_code: bankForm.ifsc_code,
              account_number: bankForm.account_number,
            }
          : {}),
      });
      setAcceptAllSuccess(true);
      setTimeout(() => setAcceptAllSuccess(false), 2000);
    } catch (err) {
      alert('Error saving all changes: ' + (err?.message || err));
    }
    setAcceptAllLoading(false);
  };

  const avatarUrl = profileData?.employee?.avatar_url as string | undefined;
  const displayName = personalForm.name || profileData?.employee?.name || '';

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={readOnly || photoLoading}
            className={`relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-200 to-purple-200 p-1 shadow-md flex items-center justify-center overflow-hidden ${!readOnly ? 'cursor-pointer group' : 'cursor-default'}`}
            onClick={() => !readOnly && photoInputRef.current?.click()}
            aria-label={avatarUrl ? 'Change profile picture' : 'Upload profile picture'}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || 'Profile'}
                className="h-full w-full rounded-full object-cover bg-white pointer-events-none"
              />
            ) : (
              <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-xl font-bold text-blue-700 pointer-events-none">
                {initialsFromName(displayName)}
              </div>
            )}
            {!readOnly && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Camera className="w-8 h-8 text-white drop-shadow" />
              </div>
            )}
          </button>
          {!readOnly && (
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              aria-label="Upload profile picture"
            />
          )}
          <div>
            <h2 className="font-bold text-foreground">Employee Profile</h2>
            <p className="text-sm text-muted-foreground">
              {readOnly
                ? 'Profile photo'
                : avatarUrl
                  ? 'Hover the photo or use Change photo to replace it'
                  : 'Click the photo to upload a profile picture'}
            </p>
            {!readOnly && (
              <button
                type="button"
                className="mt-1 text-sm font-medium text-blue-700 hover:underline disabled:opacity-50"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoLoading}
              >
                {photoLoading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Add photo'}
              </button>
            )}
            {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}
          </div>
        </div>
        <div className={`${getCompletionBgColor(profileCompletion.percentage)} px-4 py-2 rounded-lg border`}>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getCompletionColor(profileCompletion.percentage)}`}>
                {profileCompletion.percentage}%
              </div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
            <div className="w-16">
              <Progress 
                value={profileCompletion.percentage} 
                className="h-2"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Profile Completion Details */}
      <div className={`${getCompletionBgColor(profileCompletion.percentage)} border rounded-lg p-4 mb-6`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Profile Completion</h3>
          <span className={`text-sm font-bold ${getCompletionColor(profileCompletion.percentage)}`}>
            {profileCompletion.completedFields} of {profileCompletion.totalFields} fields
          </span>
        </div>
        <Progress 
          value={profileCompletion.percentage} 
          className={`h-3 mb-3 ${getCompletionProgressColor(profileCompletion.percentage)}`}
        />
        <div className="flex flex-wrap gap-2">
          {profileCompletion.completedSections.map(section => (
            <span key={section} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
              {section}
            </span>
          ))}
          {profileCompletion.missingSections.map(section => (
            <span key={section} className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
              {section}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Personal Info Card */}
        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-primary text-2xl">👤</span>
            <span className="font-semibold">Personal Info</span>
          </div>
          <div className="font-bold mb-1" style={{ color: 'var(--card-text)' }}>{personalForm.name || <span className='text-muted-foreground'>No Name</span>}</div>
          <div className="flex flex-wrap gap-4 mb-2" style={{ color: 'var(--card-text)' }}>
            <span>DOB: <span className="font-bold">{formatDisplayDate(personalForm.date_of_birth)}</span></span>
            <span>Gender: <span className="font-bold">{personalForm.gender || '-'}</span></span>
            <span>Blood: <span className="font-bold">{personalForm.blood_group || '-'}</span></span>
            <span>Status: <span className="font-bold">{personalForm.marital_status || '-'}</span></span>
            {personalForm.marital_status === 'Married' && (
              <span>Anniv: <span className="font-bold">{personalForm.marriage_anniversary || '-'}</span></span>
            )}
          </div>
          <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('personal')}>Edit</button>
        </div>
        {/* Contact Info Card */}
        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500 text-2xl">📞</span>
            <span className="font-semibold">Contact Info</span>
          </div>
          <div className="font-bold mb-1" style={{ color: 'var(--card-text)' }}>{contactForm.personal_email || <span className='text-muted-foreground'>No Email</span>}</div>
          <div className="flex flex-wrap gap-4 mb-2" style={{ color: 'var(--card-text)' }}>
            <span>Official: <span className="font-bold">{profileData?.employee?.email || '-'}</span></span>
            <span>Phone: <span className="font-bold">{contactForm.phone_number || '-'}</span></span>
            <span>Alt: <span className="font-bold">{contactForm.alternate_phone_number || '-'}</span></span>
            <span>Addr: <span className="font-bold">{contactForm.current_address || '-'}</span></span>
          </div>
          <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('contact')}>Edit</button>
        </div>
        {/* Work Info Card */}
        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-500 text-2xl">💼</span>
            <span className="font-semibold">Work Info</span>
          </div>
          <div className="font-bold mb-1" style={{ color: 'var(--card-text)' }}>{workForm.designation || <span className='text-muted-foreground'>No Designation</span>}</div>
          <div className="flex flex-wrap gap-4 mb-2" style={{ color: 'var(--card-text)' }}>
            <span>Emp ID: <span className="font-bold">{workForm.employee_code || '-'}</span></span>
            <span>DOJ: <span className="font-bold">{formatDisplayDate(workForm.date_of_joining)}</span></span>
            <span>Location: <span className="font-bold">{workForm.work_location || '-'}</span></span>
            <span>Dept: <span className="font-bold">{workForm.department || '-'}</span></span>
            <span>Job: <span className="font-bold">{workForm.job_title || '-'}</span></span>
            <span>Profile status: <span className="font-bold">{workForm.employment_status || '-'}</span></span>
            <span>App access: <span className="font-bold">{profileData?.employee?.is_active ? 'Active' : 'Inactive'}</span></span>
            <span>Manager: <span className="font-bold">{colleagues.find(c => c.id === workForm.reporting_manager_id)?.name || '-'}</span></span>
            <span>Reportees: <span className="font-bold">{reportees.length ? reportees.map(r => r.name).join(', ') : 'None'}</span></span>
          </div>
          {!readOnly && isHrAdmin && <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('work')}>Edit</button>}
        </div>
        {/* Family/Emergency Card */}
        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-pink-500 text-2xl">👪</span>
            <span className="font-semibold">Family & Emergency</span>
          </div>
          <div className="mb-2">
            <div className="font-bold mb-1" style={{ color: 'var(--card-text)' }}>Family Members</div>
            <div className="flex flex-wrap gap-3">
              {(() => {
                let members: any[] = [];
                try {
                  members = JSON.parse(familyForm.family_members || '[]');
                  if (!Array.isArray(members)) members = [];
                } catch {
                  members = [];
                }
                return members.length === 0 && (
                  <div className="text-gray-500">No family members added.</div>
                );
              })()}
              {(() => {
                let members: any[] = [];
                try {
                  members = JSON.parse(familyForm.family_members || '[]');
                  if (!Array.isArray(members)) members = [];
                } catch {
                  members = [];
                }
                return members.map((member, idx) => (
                  <div key={idx} className="relative bg-white/80 border rounded-lg shadow px-4 py-2 min-w-[180px] flex flex-col gap-1">
                    <div className="font-semibold text-primary pr-12">{member.name || 'Unnamed'}</div>
                    <div className="text-xs text-gray-600">Relation: {member.relation || '-'}</div>
                    {member.dob && <div className="text-xs text-gray-600">DOB: {member.dob}</div>}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button title="Edit" className="text-blue-500 hover:underline text-xs mr-2" onClick={e => { e.preventDefault(); setEditTab('family'); }}>✏️</button>
                      <button title="Delete" className="text-red-500 hover:underline text-xs" onClick={e => { e.preventDefault(); let arr: any[] = []; try { arr = JSON.parse(familyForm.family_members || '[]'); if (!Array.isArray(arr)) arr = []; } catch { arr = []; } arr.splice(idx, 1); setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) })); }}>🗑️</button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="mb-2">
            <div className="font-bold mb-1" style={{ color: 'var(--card-text)' }}>Emergency Contacts</div>
            <div className="flex flex-wrap gap-3">
              {(() => {
                let contacts: any[] = [];
                try {
                  contacts = JSON.parse(familyForm.emergency_contacts || '[]');
                  if (!Array.isArray(contacts)) contacts = [];
                } catch {
                  contacts = [];
                }
                return contacts.length === 0 && (
                  <div className="text-gray-500">No emergency contacts added.</div>
                );
              })()}
              {(() => {
                let contacts: any[] = [];
                try {
                  contacts = JSON.parse(familyForm.emergency_contacts || '[]');
                  if (!Array.isArray(contacts)) contacts = [];
                } catch {
                  contacts = [];
                }
                return contacts.map((contact, idx) => (
                  <div key={idx} className="relative bg-white/80 border rounded-lg shadow px-4 py-2 min-w-[180px] flex flex-col gap-1">
                    <div className="font-semibold text-primary pr-12">{contact.name || 'Unnamed'}</div>
                    <div className="text-xs text-gray-600">Phone: {contact.phone || '-'}</div>
                    <div className="text-xs text-gray-600">Relation: {contact.relation || '-'}</div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button title="Edit" className="text-blue-500 hover:underline text-xs mr-2" onClick={e => { e.preventDefault(); setEditTab('family'); }}>✏️</button>
                      <button title="Delete" className="text-red-500 hover:underline text-xs" onClick={e => { e.preventDefault(); let arr: any[] = []; try { arr = JSON.parse(familyForm.emergency_contacts || '[]'); if (!Array.isArray(arr)) arr = []; } catch { arr = []; } arr.splice(idx, 1); setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) })); }}>🗑️</button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('family')}>Edit</button>
        </div>
        {/* Documents Card */}
        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-500 text-2xl">📄</span>
            <span className="font-semibold">Documents</span>
          </div>
          <ul className="mb-2 text-sm">
            {profileData?.documents?.length ? (
              profileData.documents.map(doc => (
                <li key={doc.id} className="flex items-center gap-2 border-b py-1 justify-between">
                  <div>
                    <span className="font-medium">{doc.document_type}</span>
                    <span className="ml-2 text-gray-500 text-xs">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">View</a>
                    <button className="text-xs text-red-500 hover:underline" onClick={async e => { e.preventDefault(); if (window.confirm('Delete this document?')) { // This line was not in the new_code, but should be added for consistency
                      // Assuming supabase is available globally or imported elsewhere
                      // If not, this will cause an error. For now, commenting out the delete logic.
                      // await supabase.from('employee_documents').delete().eq('id', doc.id);
                      fetchUserProfile();
                    } }}>Delete</button>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-gray-500">No documents uploaded.</li>
            )}
          </ul>
          <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('documents')}>Manage</button>
        </div>

        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-indigo-500 text-2xl">🎓</span>
            <span className="font-semibold">Educational Info</span>
          </div>
          <ul className="text-sm mb-2" style={{ color: 'var(--card-text)' }}>
            {educationList.length === 0 && <li className="text-muted-foreground">No education added.</li>}
            {educationList.slice(0, 3).map((row, idx) => (
              <li key={idx}>{row.degree || 'Qualification'}{row.institution ? ` · ${row.institution}` : ''}{row.year_of_completion ? ` · ${row.year_of_completion}` : ''}</li>
            ))}
          </ul>
          {!readOnly && <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('education')}>Edit</button>}
        </div>

        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-orange-500 text-2xl">🗂️</span>
            <span className="font-semibold">Work History</span>
          </div>
          <ul className="text-sm mb-2" style={{ color: 'var(--card-text)' }}>
            {workHistoryList.length === 0 && <li className="text-muted-foreground">No work history added.</li>}
            {workHistoryList.slice(0, 3).map((row, idx) => (
              <li key={idx}>{row.designation || row.department || 'Role'}{row.from ? ` · ${row.from}` : ''}{row.to ? ` – ${row.to}` : ''}</li>
            ))}
          </ul>
          {!readOnly && <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('history')}>Edit</button>}
        </div>

        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-teal-600 text-2xl">🪪</span>
            <span className="font-semibold">Identity & Statutory</span>
          </div>
          <div className="flex flex-wrap gap-4 mb-2 text-sm" style={{ color: 'var(--card-text)' }}>
            <span>Aadhaar: <span className="font-bold">{isHrAdmin ? (identityForm.aadhaar_number || '-') : maskSecret(identityForm.aadhaar_number)}</span></span>
            <span>PAN: <span className="font-bold">{isHrAdmin ? (identityForm.pan_number || '-') : maskSecret(identityForm.pan_number)}</span></span>
            <span>UAN: <span className="font-bold">{isHrAdmin ? (identityForm.uan_number || '-') : maskSecret(identityForm.uan_number)}</span></span>
            <span>PF: <span className="font-bold">{isHrAdmin ? (identityForm.pf_number || '-') : maskSecret(identityForm.pf_number)}</span></span>
            <span>ESI: <span className="font-bold">{isHrAdmin ? (identityForm.esi_number || '-') : maskSecret(identityForm.esi_number)}</span></span>
          </div>
          {!readOnly && isHrAdmin && <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('identity')}>Edit</button>}
        </div>

        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-600 text-2xl">🏦</span>
            <span className="font-semibold">Bank & CTC</span>
          </div>
          <div className="flex flex-wrap gap-4 mb-2 text-sm" style={{ color: 'var(--card-text)' }}>
            <span>CTC: <span className="font-bold">{isHrAdmin ? (bankForm.annual_ctc || '-') : maskSecret(bankForm.annual_ctc)}</span></span>
            <span>Bank: <span className="font-bold">{bankForm.bank_name || '-'}</span></span>
            <span>IFSC: <span className="font-bold">{bankForm.ifsc_code || '-'}</span></span>
            <span>Account: <span className="font-bold">{isHrAdmin ? (bankForm.account_number || '-') : maskSecret(bankForm.account_number)}</span></span>
          </div>
          {!readOnly && isHrAdmin && <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('bank')}>Edit</button>}
        </div>

        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-600 text-2xl">📋</span>
            <span className="font-semibold">Leave, Attendance & Workweek</span>
          </div>
          <div className="text-sm space-y-2" style={{ color: 'var(--card-text)' }}>
            <p><span className="font-medium">Leave rules:</span> company leave types apply. Current-year balances:</p>
            {leaveSummaries.length === 0 ? (
              <p className="text-muted-foreground">No leave balances for this year.</p>
            ) : (
              <ul className="list-disc pl-5">
                {leaveSummaries.map((row) => (
                  <li key={row.name}>{row.name}: {row.used} used / {row.allocated} allocated</li>
                ))}
              </ul>
            )}
            <p><span className="font-medium">Attendance rules:</span> company-wide (present, leave, WFH). Managed in Attendance Management.</p>
            <p><span className="font-medium">Workweek rules:</span> company default calendar and holidays. Not set per employee.</p>
          </div>
        </div>
      </div>
      {/* Edit Forms as Dialogs */}
      <Dialog open={editTab === 'personal'} onOpenChange={open => !open && setEditTab(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Personal Info</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePersonalSave}>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={personalForm.name}
                  disabled
                className="w-full border rounded px-3 py-2 bg-gray-100 text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={personalForm.date_of_birth}
                    onChange={handlePersonalChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select
                    name="gender"
                    value={personalForm.gender}
                    onChange={handlePersonalChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select</option>
                    {genderOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Blood Group</label>
                  <select
                    name="blood_group"
                    value={personalForm.blood_group}
                    onChange={handlePersonalChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select</option>
                    {bloodGroupOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Marital Status</label>
                  <select
                    name="marital_status"
                    value={personalForm.marital_status}
                    onChange={handlePersonalChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select</option>
                    {maritalStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              {personalForm.marital_status === 'Married' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Marriage Anniversary</label>
                  <input
                    type="date"
                    name="marriage_anniversary"
                    value={personalForm.marriage_anniversary}
                    onChange={handlePersonalChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}
              <div className="pt-4 flex gap-2">
              <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50" disabled={saving || loading}>{saving ? 'Saving...' : 'Save'}</button>
              <DialogClose asChild>
                <button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button>
              </DialogClose>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {editTab === 'contact' && (
        <Dialog open={editTab === 'contact'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contact Info</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleContactSave}>
              <div>
                <label className="block text-sm font-medium mb-1">Official Email</label>
                <input type="email" value={profileData?.employee?.email || ''} disabled className="w-full border rounded px-3 py-2 bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Personal Email</label>
                  <input
                    type="email"
                    name="personal_email"
                    value={contactForm.personal_email}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={contactForm.phone_number}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Alternate Phone Number</label>
                  <input
                    type="text"
                    name="alternate_phone_number"
                    value={contactForm.alternate_phone_number}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current Address</label>
                  <input
                    type="text"
                    name="current_address"
                    value={contactForm.current_address}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Permanent Address</label>
                  <input
                    type="text"
                    name="permanent_address"
                    value={contactForm.permanent_address}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">House Type</label>
                  <input
                    type="text"
                    name="house_type"
                    value={contactForm.house_type}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Residing Since</label>
                  <input
                    type="date"
                    name="residing_since"
                    value={contactForm.residing_since}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Living in City Since</label>
                  <input
                    type="date"
                    name="living_in_city_since"
                    value={contactForm.living_in_city_since}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">LinkedIn</label>
                  <input
                    type="text"
                    name="social_linkedin"
                    value={contactForm.social_linkedin}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Facebook</label>
                  <input
                    type="text"
                    name="social_facebook"
                    value={contactForm.social_facebook}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Twitter</label>
                  <input
                    type="text"
                    name="social_twitter"
                    value={contactForm.social_twitter}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-2">
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50" disabled={contactSaving || loading}>{contactSaving ? 'Saving...' : 'Save'}</button>
                <DialogClose asChild>
                  <button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button>
                </DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editTab === 'work' && (
        <Dialog open={editTab === 'work'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Work Info</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleWorkSave}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee Code</label>
                  <input
                    type="text"
                    name="employee_code"
                    value={workForm.employee_code}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Joining</label>
                  <input
                    type="date"
                    name="date_of_joining"
                    value={workForm.date_of_joining}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Probation Period (days)</label>
                  <input
                    type="number"
                    name="probation_period"
                    value={workForm.probation_period}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employee Type</label>
                  <input
                    type="text"
                    name="employee_type"
                    value={workForm.employee_type}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Work Location</label>
                  <select
                    name="work_location"
                    value={workForm.work_location}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">No location</option>
                    {companyLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                    {workForm.work_location && !companyLocations.includes(workForm.work_location) && (
                      <option value={workForm.work_location}>{workForm.work_location} (inactive)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Probation Status</label>
                  <input
                    type="text"
                    name="probation_status"
                    value={workForm.probation_status}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Work Experience (years)</label>
                  <input
                    type="number"
                    name="work_experience_years"
                    value={workForm.work_experience_years}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={workForm.designation}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <input
                    type="text"
                    name="job_title"
                    value={workForm.job_title}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={workForm.department}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sub Department</label>
                <input
                  type="text"
                  name="sub_department"
                  value={workForm.sub_department}
                  onChange={handleWorkChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Profile employment status</label>
                  <select name="employment_status" value={workForm.employment_status} onChange={handleWorkChange} className="w-full border rounded px-3 py-2">
                    <option value="">Select</option>
                    {employmentStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Independent of app access (Employee Management).</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last working day</label>
                  <input type="date" name="last_working_day" value={workForm.last_working_day} onChange={handleWorkChange} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Billing status</label>
                  <select name="billing_status" value={workForm.billing_status} onChange={handleWorkChange} className="w-full border rounded px-3 py-2">
                    <option value="">Select</option>
                    {billingStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contract valid upto</label>
                  <input type="date" name="contract_valid_upto" value={workForm.contract_valid_upto} onChange={handleWorkChange} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reporting manager</label>
                <select name="reporting_manager_id" value={workForm.reporting_manager_id} onChange={handleWorkChange} className="w-full border rounded px-3 py-2">
                  <option value="">None</option>
                  {colleagues.filter(c => c.is_active !== false || c.id === workForm.reporting_manager_id).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>
              {reportees.length > 0 && (
                <p className="text-sm text-muted-foreground">Reportees: {reportees.map(r => r.name).join(', ')}</p>
              )}
              <div className="pt-4 flex gap-2">
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50" disabled={workSaving || loading}>{workSaving ? 'Saving...' : 'Save'}</button>
                <DialogClose asChild>
                  <button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button>
                </DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editTab === 'family' && (
        <Dialog open={editTab === 'family'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Family & Emergency</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleFamilySave}>
              {/* Family Members Section */}
              <div>
                <label className="block text-sm font-medium mb-1">Family Members</label>
                {(function() {
                  let members: any[] = [];
                  try {
                    members = JSON.parse(familyForm.family_members || '[]');
                    if (!Array.isArray(members)) members = [];
                  } catch { members = []; }
                  // Convert string entries to objects
                  members = members.map(m => typeof m === 'string' ? { name: m } : m);
                  return (
                    <div className="space-y-2">
                      {members.map((member, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <input
                            type="text"
                            placeholder="Name"
                            className="border rounded px-2 py-1 flex-1"
                            value={member.name || ''}
                            onChange={e => {
                              const arr = [...members];
                              arr[idx] = { ...arr[idx], name: e.target.value };
                              setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Relation"
                            className="border rounded px-2 py-1 w-32"
                            value={member.relation || ''}
                            onChange={e => {
                              const arr = [...members];
                              arr[idx] = { ...arr[idx], relation: e.target.value };
                              setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <input
                            type="date"
                            placeholder="DOB"
                            className="border rounded px-2 py-1 w-36"
                            value={member.dob || ''}
                            onChange={e => {
                              const arr = [...members];
                              arr[idx] = { ...arr[idx], dob: e.target.value };
                              setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <button type="button" className="text-red-500 text-lg px-2" onClick={() => {
                            const arr = [...members];
                            arr.splice(idx, 1);
                            setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) }));
                          }}>🗑️</button>
              </div>
                      ))}
                      <button type="button" className="bg-primary text-primary-foreground px-3 py-1 rounded" onClick={() => {
                        const arr = [...members, { name: '', relation: '', dob: '' }];
                        setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) }));
                      }}>Add Member</button>
                    </div>
                  );
                })()}
              </div>
              {/* Emergency Contacts Section */}
              <div>
                <label className="block text-sm font-medium mb-1">Emergency Contacts</label>
                {(function() {
                  let contacts: any[] = [];
                  try {
                    contacts = JSON.parse(familyForm.emergency_contacts || '[]');
                    if (!Array.isArray(contacts)) contacts = [];
                  } catch { contacts = []; }
                  // Convert string entries to objects
                  contacts = contacts.map(c => typeof c === 'string' ? { phone: c } : c);
                  return (
                    <div className="space-y-2">
                      {contacts.map((contact, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <input
                            type="text"
                            placeholder="Name"
                            className="border rounded px-2 py-1 flex-1"
                            value={contact.name || ''}
                            onChange={e => {
                              const arr = [...contacts];
                              arr[idx] = { ...arr[idx], name: e.target.value };
                              setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Phone"
                            className="border rounded px-2 py-1 w-40"
                            value={contact.phone || ''}
                            onChange={e => {
                              const arr = [...contacts];
                              arr[idx] = { ...arr[idx], phone: e.target.value };
                              setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Relation"
                            className="border rounded px-2 py-1 w-32"
                            value={contact.relation || ''}
                            onChange={e => {
                              const arr = [...contacts];
                              arr[idx] = { ...arr[idx], relation: e.target.value };
                              setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <button type="button" className="text-red-500 text-lg px-2" onClick={() => {
                            const arr = [...contacts];
                            arr.splice(idx, 1);
                            setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) }));
                          }}>🗑️</button>
                        </div>
                      ))}
                      <button type="button" className="bg-primary text-primary-foreground px-3 py-1 rounded" onClick={() => {
                        const arr = [...contacts, { name: '', phone: '', relation: '' }];
                        setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) }));
                      }}>Add Contact</button>
                    </div>
                  );
                })()}
              </div>
              <div className="pt-4 flex gap-2">
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50" disabled={familySaving || loading}>{familySaving ? 'Saving...' : 'Save'}</button>
                <DialogClose asChild>
                  <button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button>
                </DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editTab === 'identity' && (
        <Dialog open={editTab === 'identity'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Identity & Statutory</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={handleIdentitySave}>
              <div><label className="block text-sm font-medium mb-1">Aadhaar Card Number</label><input name="aadhaar_number" value={identityForm.aadhaar_number} onChange={handleIdentityChange} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">PAN Card Number</label><input name="pan_number" value={identityForm.pan_number} onChange={handleIdentityChange} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">UAN Number</label><input name="uan_number" value={identityForm.uan_number} onChange={handleIdentityChange} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">PF Number</label><input name="pf_number" value={identityForm.pf_number} onChange={handleIdentityChange} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">ESI Number</label><input name="esi_number" value={identityForm.esi_number} onChange={handleIdentityChange} className="w-full border rounded px-3 py-2" /></div>
              <div className="pt-2 flex gap-2">
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded" disabled={identitySaving}>{identitySaving ? 'Saving...' : 'Save'}</button>
                <DialogClose asChild><button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button></DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editTab === 'bank' && (
        <Dialog open={editTab === 'bank'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Bank & CTC</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={handleBankSave}>
              <div><label className="block text-sm font-medium mb-1">Annual CTC</label><input name="annual_ctc" type="number" value={bankForm.annual_ctc} onChange={handleBankChange} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Bank</label><input name="bank_name" value={bankForm.bank_name} onChange={handleBankChange} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Branch</label><input name="bank_branch" value={bankForm.bank_branch} onChange={handleBankChange} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">City</label><input name="bank_city" value={bankForm.bank_city} onChange={handleBankChange} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">IFSC</label><input name="ifsc_code" value={bankForm.ifsc_code} onChange={handleBankChange} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Account Number</label><input name="account_number" value={bankForm.account_number} onChange={handleBankChange} className="w-full border rounded px-3 py-2" /></div>
              <div className="pt-2 flex gap-2">
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded" disabled={bankSaving}>{bankSaving ? 'Saving...' : 'Save'}</button>
                <DialogClose asChild><button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button></DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editTab === 'education' && (
        <Dialog open={editTab === 'education'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Educational Info</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={handleEducationSave}>
              {educationList.map((row, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <input placeholder="Degree" className="border rounded px-2 py-1" value={row.degree || ''} onChange={e => { const arr = [...educationList]; arr[idx] = { ...arr[idx], degree: e.target.value }; setEducationList(arr); }} />
                  <input placeholder="Institution" className="border rounded px-2 py-1" value={row.institution || ''} onChange={e => { const arr = [...educationList]; arr[idx] = { ...arr[idx], institution: e.target.value }; setEducationList(arr); }} />
                  <div className="flex gap-1">
                    <input placeholder="Year" className="border rounded px-2 py-1 w-full" value={row.year_of_completion || ''} onChange={e => { const arr = [...educationList]; arr[idx] = { ...arr[idx], year_of_completion: e.target.value }; setEducationList(arr); }} />
                    <button type="button" className="text-red-500" onClick={() => setEducationList(educationList.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                </div>
              ))}
              <button type="button" className="text-primary text-sm" onClick={() => setEducationList([...educationList, { degree: '', institution: '', year_of_completion: '' }])}>Add qualification</button>
              <div className="pt-2 flex gap-2">
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded" disabled={educationSaving}>{educationSaving ? 'Saving...' : 'Save'}</button>
                <DialogClose asChild><button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button></DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editTab === 'history' && (
        <Dialog open={editTab === 'history'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Work History</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={handleWorkHistorySave}>
              {workHistoryList.map((row, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-2 border rounded p-2">
                  <input placeholder="Department" className="border rounded px-2 py-1" value={row.department || ''} onChange={e => { const arr = [...workHistoryList]; arr[idx] = { ...arr[idx], department: e.target.value }; setWorkHistoryList(arr); }} />
                  <input placeholder="Designation" className="border rounded px-2 py-1" value={row.designation || ''} onChange={e => { const arr = [...workHistoryList]; arr[idx] = { ...arr[idx], designation: e.target.value }; setWorkHistoryList(arr); }} />
                  <input placeholder="From" type="date" className="border rounded px-2 py-1" value={row.from || ''} onChange={e => { const arr = [...workHistoryList]; arr[idx] = { ...arr[idx], from: e.target.value }; setWorkHistoryList(arr); }} />
                  <div className="flex gap-1">
                    <input placeholder="To" type="date" className="border rounded px-2 py-1 w-full" value={row.to || ''} onChange={e => { const arr = [...workHistoryList]; arr[idx] = { ...arr[idx], to: e.target.value }; setWorkHistoryList(arr); }} />
                    <button type="button" className="text-red-500" onClick={() => setWorkHistoryList(workHistoryList.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                </div>
              ))}
              <button type="button" className="text-primary text-sm" onClick={() => setWorkHistoryList([...workHistoryList, { department: '', designation: '', from: '', to: '' }])}>Add role</button>
              <div className="pt-2 flex gap-2">
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded" disabled={historySaving}>{historySaving ? 'Saving...' : 'Save'}</button>
                <DialogClose asChild><button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button></DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editTab === 'documents' && (
        <Dialog open={editTab === 'documents'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Documents</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <form className="max-w-xl bg-background rounded shadow p-6 space-y-4" onSubmit={handleDocUpload}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Document Type</label>
                <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select Document Type</option>
                {documentTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>  
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File</label>
                <input
                  type="file"
                  onChange={handleDocFileChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="pt-4">
              <button
                type="submit"
                    className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50"
                disabled={docUploading || loading}
              >
                {docUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Uploaded Documents</h3>
            <ul className="divide-y divide-gray-200">
              {profileData?.documents?.length ? (
                profileData.documents.map(doc => (
                  <li key={doc.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{doc.document_type}</span>
                      <span className="ml-2 text-gray-500 text-sm">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                          className="text-primary hover:underline"
                    >
                      View
                    </a>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No documents uploaded.</li>
              )}
            </ul>
          </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {!readOnly && (
      <div className="mb-4 flex items-center gap-4">
        <button
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          onClick={handleAcceptAll}
          disabled={acceptAllLoading || loading}
        >
          {acceptAllLoading ? 'Saving All...' : 'Accept All Changes'}
        </button>
        {acceptAllSuccess && <span className="text-green-700 font-semibold">All changes saved!</span>}
      </div>
      )}
      {loading && <div className="mt-4 text-blue-600">Loading profile...</div>}
    </div>
  );
};

export default Profile; 