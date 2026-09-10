import React, { useEffect } from 'react';
import { Contact, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useEmployeeProfileFieldVisibility } from '@/hooks/useEmployeeProfileFieldVisibility';

const MUMBAI_OFFICE_ADDRESS = 'Knox Plaza, B-Wing, Office No. 307, Chincholi Bunder Road, Mindspace (Next to VIBGYOR School), Malad (West), Mumbai, 400064';
const OFFICE_ADDRESSES: Record<string, string> = {
  mumbai: MUMBAI_OFFICE_ADDRESS,
  noida: 'A-130, A Block, Sector 63, Noida, Uttar Pradesh 201309',
  indore: '207, Princess Business Skyline, Westside Building, AB Road, Indore, 452001',
  iselin: '120 Wood Ave S, suite 504. Iselin NJ 08830',
  wfh: MUMBAI_OFFICE_ADDRESS,
};

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
  const workLocation = profile?.work_location || employee?.work_location || '';
  const officeAddress = OFFICE_ADDRESSES[workLocation.trim().toLowerCase()] || MUMBAI_OFFICE_ADDRESS;
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
          <header className="employee-id-card-header relative z-10 flex flex-col items-center gap-2 border-b border-slate-200 px-5 py-3 text-center">
            <div className="flex w-full min-w-0 items-center justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Company logo" className="employee-id-card-logo rounded-md object-contain" />
              ) : (
                <div className="employee-id-card-logo flex items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">LOGO</div>
              )}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Employee identity card</p>
          </header>

          <div className="employee-id-card-body relative z-10 flex gap-4 px-5 py-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                aria-hidden="true"
                className="employee-id-card-watermark absolute inset-0 z-0 h-full w-full object-contain p-3"
              />
            )}
            <div className="employee-id-card-photo relative z-10 h-28 w-24 shrink-0 overflow-hidden rounded-lg border-2 border-slate-200 bg-slate-100">
              {avatarUrl ? (
                <img src={avatarUrl} alt={employeeName} className="relative z-10 h-full w-full object-cover" />
              ) : (
                <div className="relative z-10 flex h-full w-full items-center justify-center bg-white/45 text-3xl font-bold text-slate-400">
                  {employeeName.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <dl className="employee-id-card-details relative z-10 min-w-0 flex-1 space-y-2 text-xs">
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

          <footer className="employee-id-card-footer relative z-10 shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Office Address</p>
            <p className="employee-id-card-address mt-1 text-[9px] leading-3 text-slate-700">{officeAddress}</p>
          </footer>
        </article>
      </div>

      <style>{`
        .employee-id-card {
          width: min(100%, 360px);
          aspect-ratio: 53.98 / 85.6;
          min-height: 560px;
          display: flex;
          flex-direction: column;
        }
        .employee-id-card-accent {
          height: 7px;
          background: linear-gradient(90deg, #0f172a 0%, #2563eb 55%, #14b8a6 100%);
        }
        .employee-id-card-logo {
          width: 88px;
          height: 88px;
        }
        .employee-id-card-watermark {
          opacity: 0.18;
          filter: saturate(0.65);
          pointer-events: none;
        }
        .employee-id-card-body {
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-height: 0;
          padding-top: 1.25rem;
          background: linear-gradient(145deg, #fbfdff 0%, #f1f7ff 52%, #eaf2ff 100%);
        }
        .employee-id-card-address {
          overflow-wrap: anywhere;
          word-break: normal;
        }
        .employee-id-card-photo {
          width: 132px;
          height: 156px;
        }
        .employee-id-card-details {
          width: 100%;
        }
        .employee-id-card-details > div {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.5rem;
        }
        .employee-id-card-details .grid {
          grid-template-columns: 1fr;
          gap: 0.5rem;
        }
        @media print {
          @page { size: 53.98mm 85.6mm; margin: 0; }
          body { background: white !important; }
          body * { visibility: hidden !important; }
          .employee-id-card-print,
          .employee-id-card-print * { visibility: visible !important; }
          .employee-id-card-page { padding: 0 !important; }
          .employee-id-card-print { display: block !important; }
          .employee-id-card {
            width: 53.98mm !important;
            height: 85.6mm !important;
            min-height: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .employee-id-card-footer {
            padding: 5px 10px !important;
          }
          .employee-id-card-header {
            gap: 1px !important;
            padding: 5px 10px !important;
          }
          .employee-id-card-logo {
            width: 66px !important;
            height: 66px !important;
          }
          .employee-id-card-address {
            font-size: 7px !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeIdCard;
