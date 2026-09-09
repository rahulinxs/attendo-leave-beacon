import React, { useEffect } from 'react';
import { Contact, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useEmployeeProfileFieldVisibility } from '@/hooks/useEmployeeProfileFieldVisibility';

const MUMBAI_OFFICE_ADDRESS = 'Knox Plaza, B-Wing, Office No. 307, Chincholi Bunder Road, Mindspace (Next to VIBGYOR School), Malad (West), Mumbai, 400064';

const parseEmergencyContact = (value: unknown) => {
  if (Array.isArray(value)) return value[0] || {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed[0] || {} : {};
    } catch {
      return {};
    }
  }
  return {};
};

interface EmployeeIdCardProps {
  employeeId: string;
}

const EmployeeIdCard: React.FC<EmployeeIdCardProps> = ({ employeeId }) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { profileData, fetchUserProfile, loading } = useUserProfile(employeeId);
  const { isVisible } = useEmployeeProfileFieldVisibility(employeeId);

  useEffect(() => {
    fetchUserProfile();
    // The employee ID is the fetch boundary for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isVisible('employee_id_card')) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-card p-8 text-center shadow-sm">
        <Contact className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Employee ID Card unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">This module has been disabled for your employee profile.</p>
      </div>
    );
  }

  const employee = profileData?.employee;
  const profile = profileData?.profile;
  const emergencyContact = parseEmergencyContact(profile?.emergency_contacts);
  const employeeName = employee?.name || 'Employee';
  const designation = profile?.designation || employee?.position || '-';
  const employeeCode = profile?.employee_code || '-';
  const bloodGroup = profile?.blood_group || '-';
  const emergencyNumber = emergencyContact.phone_number || emergencyContact.phone || '-';
  const logoUrl = currentCompany?.logo_url;
  const avatarUrl = employee?.avatar_url || (employeeId === user?.id ? user.avatar_url : null);

  const handlePrint = () => window.print();

  return (
    <div className="employee-id-card-page min-h-full space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee ID Card</h1>
          <p className="text-sm text-muted-foreground">Your standard employee identification card</p>
        </div>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print ID Card
        </Button>
      </div>

      <div className="employee-id-card-print flex justify-center">
        <article className="employee-id-card relative overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl">
          <div className="employee-id-card-accent" />
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Company logo" className="h-11 w-11 rounded-md object-contain" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">LOGO</div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{currentCompany?.name || 'Company'}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Employee identity card</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">Official</span>
          </header>

          <div className="flex gap-4 px-5 py-4">
            <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg border-2 border-slate-200 bg-slate-100">
              {avatarUrl ? (
                <img src={avatarUrl} alt={employeeName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-400">
                  {employeeName.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <dl className="min-w-0 flex-1 space-y-2 text-xs">
              <div>
                <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Name</dt>
                <dd className="truncate text-base font-bold">{employeeName}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Designation</dt>
                  <dd className="truncate font-semibold">{designation}</dd>
                </div>
                <div>
                  <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Emp ID No</dt>
                  <dd className="truncate font-semibold">{employeeCode}</dd>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Blood Group</dt>
                  <dd className="font-semibold">{bloodGroup}</dd>
                </div>
                <div>
                  <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Emergency Contact</dt>
                  <dd className="truncate font-semibold">{emergencyNumber}</dd>
                </div>
              </div>
            </dl>
          </div>

          <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Office Address</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-700">{MUMBAI_OFFICE_ADDRESS}</p>
          </footer>
        </article>
      </div>

      <style>{`
        .employee-id-card {
          width: min(100%, 560px);
          aspect-ratio: 85.6 / 53.98;
          min-height: 340px;
        }
        .employee-id-card-accent {
          height: 7px;
          background: linear-gradient(90deg, #0f172a 0%, #2563eb 55%, #14b8a6 100%);
        }
        @media print {
          @page { size: 85.6mm 53.98mm; margin: 0; }
          body { background: white !important; }
          body * { visibility: hidden !important; }
          .employee-id-card-print,
          .employee-id-card-print * { visibility: visible !important; }
          .employee-id-card-page { padding: 0 !important; }
          .employee-id-card-print { display: block !important; }
          .employee-id-card {
            width: 85.6mm !important;
            height: 53.98mm !important;
            min-height: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeIdCard;
