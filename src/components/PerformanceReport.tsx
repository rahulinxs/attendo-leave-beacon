import React, { useState, useEffect, useRef } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from '@/hooks/use-toast';

const columns = [
  'Team', 'USER NAME', 'Monster', 'Dice', 'LinkedIn Profiles viewed', 'LinkedIn InMails sent',
  'Total Calls', 'Total Call Duration', 'Total Submissions', 'Total Interviews', 'Offers', 'Starts', 'Placed', 'Offered'
];

const getMonthOptions = () => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months.map((m, i) => ({ label: m, value: i + 1 }));
};

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1];
};

const PerformanceReport: React.FC = () => {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamLookup, setTeamLookup] = useState<Record<string, string>>({});
  const [userLookup, setUserLookup] = useState<Record<string, string>>({});
  const [userNameToUserId, setUserNameToUserId] = useState<Record<string, string>>({});
  const [userIdToTeamId, setUserIdToTeamId] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'upsert' | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewData, setReviewData] = useState<any[]>([]);
  const [reviewMode, setReviewMode] = useState<'replace' | 'upsert' | null>(null);
  const [saving, setSaving] = useState(false);
  const [addEmployeeIdx, setAddEmployeeIdx] = useState<number | null>(null);
  const [addEmployeeForm, setAddEmployeeForm] = useState({
    name: '',
    email: '',
    team_id: '',
    role: 'employee',
    position: '',
    status: 'inactive',
    error: '',
    loading: false,
  });

  // Fetch teams and users for lookup
  useEffect(() => {
    const fetchLookups = async () => {
      if (!currentCompany?.id) return;
      // Fetch teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('company_id', currentCompany.id);
      // Fetch employees
      const { data: users } = await supabase
        .from('employees')
        .select('id, name, team_id')
        .eq('company_id', currentCompany.id);
      // Build lookup maps
      const teamMap: Record<string, string> = {};
      (teams || []).forEach((t: any) => { teamMap[t.id] = t.name; });
      setTeamLookup(teamMap);
      const userMap: Record<string, string> = {};
      const userNameMap: Record<string, string> = {};
      const userTeamMap: Record<string, string> = {};
      (users || []).forEach((u: any) => {
        userMap[u.id] = u.name;
        userNameMap[u.name] = u.id;
        userTeamMap[u.id] = u.team_id;
      });
      setUserLookup(userMap);
      setUserNameToUserId(userNameMap);
      setUserIdToTeamId(userTeamMap);
    };
    fetchLookups();
  }, [currentCompany]);

  useEffect(() => {
    const fetchReports = async () => {
      if (!currentCompany?.id) return;
      setLoading(true);
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      console.log('Fetching reports for:', startDate, endDate, currentCompany.id);
      const { data, error } = await supabase
        .from('performance_reports')
        .select('*')
        .eq('company_id', currentCompany.id)
        .gte('report_date', startDate)
        .lte('report_date', endDate);
      if (!error && data) setReportData(data);
      else setReportData([]);
      setLoading(false);
    };
    fetchReports();
  }, [currentCompany, month, year]);

  if (!currentCompany?.moduleSettings?.performance_report_enabled) {
    return null;
  }
  if (!['admin', 'super_admin', 'reporting_manager'].includes(user?.role)) {
    return null;
  }

  // Excel import handler
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportDialogOpen(true);
  };

  // Add helper functions for parsing
  const parseNumber = (val: any) => {
    if (typeof val === 'string') return parseInt(val.replace(/,/g, ''), 10) || 0;
    return val || 0;
  };
  const parseDuration = (val: any) => {
    // Accepts 'hh:mm:ss' or 'h:mm:ss' and returns as is for PostgreSQL INTERVAL
    if (typeof val === 'string' && /^\d{1,2}:\d{2}:\d{2}$/.test(val.trim())) {
      return val.trim();
    }
    return '0:00:00';
  };

  // Process import after user chooses mode (show preview for review)
  const processImport = async (mode: 'replace' | 'upsert') => {
    if (!importFile) return;
    setImportDialogOpen(false);
    let workbook;
    if (importFile.name.endsWith('.csv')) {
      // For CSV, XLSX.read expects a string, not arrayBuffer
      const text = await importFile.text();
      workbook = XLSX.read(text, { type: 'string' });
    } else {
      workbook = XLSX.read(await importFile.arrayBuffer());
    }
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(worksheet);
    // Map Excel columns to DB fields using user name for both user_id and team_id
    const mapped = (json as any[]).map((row: any) => {
      const user_id = userNameToUserId[row['USER NAME']] || '';
      const team_id = userIdToTeamId[user_id] || '';
      return {
        team: row['Team'] || '',
        user: row['USER NAME'] || '',
        team_id,
        user_id,
        monster: parseNumber(row['Monster']),
        dice: parseNumber(row['Dice']),
        linkedin_profiles_viewed: parseNumber(row['LinkedIn Profiles viewed']),
        linkedin_inmails_sent: parseNumber(row['LinkedIn InMails sent']),
        total_calls: parseNumber(row['Total Calls']),
        total_call_duration: parseDuration(row['Total Call Duration']),
        total_submissions: parseNumber(row['Total Submissions']),
        total_interviews: parseNumber(row['Total Interviews']),
        offers: parseNumber(row['Offers']),
        starts: parseNumber(row['Starts']),
        placed: parseNumber(row['Placed']),
        offered: parseNumber(row['Offered']),
        report_date: `${year}-${month.toString().padStart(2, '0')}-01`,
        company_id: currentCompany.id,
      };
    });
    // Validate and collect errors
    const errors: string[] = [];
    mapped.forEach((row, idx) => {
      if (!row.user_id) errors.push(`Row ${idx + 1}: User '${row.user}' not found.`);
      if (!row.team_id) errors.push(`Row ${idx + 1}: Team for user '${row.user}' not found.`);
    });
    setImportPreview(mapped);
    setImportErrors(errors);
    setReviewDialogOpen(true);
    setReviewData(mapped);
    setReviewMode(mode);
  };

  // Allow editing of reviewData
  const handleReviewEdit = (idx: number, field: string, value: string) => {
    setReviewData(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'user') {
        const user_id = userNameToUserId[value] || '';
        updated[idx].user_id = user_id;
        updated[idx].team_id = userIdToTeamId[user_id] || '';
      }
      return updated;
    });
  };

  // Save reviewed data to Supabase
  const handleSaveImport = async () => {
    setSaving(true);
    // Validate again
    const errors: string[] = [];
    reviewData.forEach((row, idx) => {
      if (!row.user_id) errors.push(`Row ${idx + 1}: User '${row.user}' not found.`);
      if (!row.team_id) errors.push(`Row ${idx + 1}: Team for user '${row.user}' not found.`);
    });
    setImportErrors(errors);
    if (errors.length > 0) {
      setSaving(false);
      return;
    }
    try {
      if (reviewMode === 'replace') {
        await supabase
          .from('performance_reports')
          .delete()
          .eq('company_id', currentCompany.id)
          .gte('report_date', `${year}-${month.toString().padStart(2, '0')}-01`)
          .lte('report_date', `${year}-${month.toString().padStart(2, '0')}-31`);
      }
      let success = 0, fail = 0;
      for (const record of reviewData) {
        const { error } = await supabase.from('performance_reports').upsert({
          team_id: record.team_id,
          user_id: record.user_id,
          monster: record.monster,
          dice: record.dice,
          linkedin_profiles_viewed: record.linkedin_profiles_viewed,
          linkedin_inmails_sent: record.linkedin_inmails_sent,
          total_calls: record.total_calls,
          total_call_duration: record.total_call_duration,
          total_submissions: record.total_submissions,
          total_interviews: record.total_interviews,
          offers: record.offers,
          starts: record.starts,
          placed: record.placed,
          offered: record.offered,
          report_date: record.report_date,
          company_id: record.company_id,
        });
        if (error) fail++; else success++;
      }
      toast({ title: 'Import Complete', description: `${success} rows imported, ${fail} failed.` });
      setReviewDialogOpen(false);
      setImportFile(null);
      setImportMode(null);
      setImportPreview([]);
      setReviewData([]);
      setSaving(false);
      // Refresh data
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      const { data, error } = await supabase
        .from('performance_reports')
        .select('*')
        .eq('company_id', currentCompany.id)
        .gte('report_date', startDate)
        .lte('report_date', endDate);
      if (!error && data) setReportData(data);
    } catch (err) {
      toast({ title: 'Import Failed', description: 'Error importing data', variant: 'destructive' });
      setSaving(false);
    }
  };

  // In the review dialog table, for any row where user_id is missing, show 'Add Employee' button
  // When clicked, show a form to enter name, email, team, role, position, status
  // On save, insert into employees, update row with new user_id and team_id
  const handleAddEmployeeClick = (idx: number) => {
    setAddEmployeeIdx(idx);
    setAddEmployeeForm({
      name: reviewData[idx].user,
      email: '',
      team_id: '',
      role: 'employee',
      position: '',
      status: 'inactive',
      error: '',
      loading: false,
    });
  };
  const handleAddEmployeeFormChange = (field: string, value: string) => {
    setAddEmployeeForm(prev => ({ ...prev, [field]: value, error: '' }));
  };
  const handleAddEmployeeSave = async () => {
    setAddEmployeeForm(prev => ({ ...prev, loading: true, error: '' }));
    // Validate
    if (!addEmployeeForm.name || !addEmployeeForm.email || !addEmployeeForm.team_id) {
      setAddEmployeeForm(prev => ({ ...prev, loading: false, error: 'Name, email, and team are required.' }));
      return;
    }
    try {
      // Insert employee with default password (hash if possible)
      const { data, error } = await supabase.from('employees').insert({
        name: addEmployeeForm.name,
        email: addEmployeeForm.email,
        team_id: addEmployeeForm.team_id,
        role: addEmployeeForm.role,
        position: addEmployeeForm.position,
        is_active: addEmployeeForm.status === 'active',
        company_id: currentCompany.id,
        // You may need to add password logic here if your backend supports it
        // password: hash('Password123')
      }).select('id, team_id');
      if (error || !data || !data[0]) {
        setAddEmployeeForm(prev => ({ ...prev, loading: false, error: error?.message || 'Failed to add employee.' }));
        return;
      }
      // Update reviewData row with new user_id and team_id
      setReviewData(prev => {
        const updated = [...prev];
        updated[addEmployeeIdx!] = {
          ...updated[addEmployeeIdx!],
          user_id: data[0].id,
          team_id: data[0].team_id,
        };
        return updated;
      });
      setAddEmployeeIdx(null);
      setAddEmployeeForm({
        name: '', email: '', team_id: '', role: 'employee', position: '', status: 'inactive', error: '', loading: false
      });
      toast({ title: 'Employee Added', description: 'Employee added and row updated.' });
    } catch (err: any) {
      setAddEmployeeForm(prev => ({ ...prev, loading: false, error: err.message || 'Failed to add employee.' }));
    }
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>Performance Report</CardTitle>
        <div className="flex gap-4 mt-2 items-center">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border rounded px-2 py-1">
            {getMonthOptions().map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="border rounded px-2 py-1">
            {getYearOptions().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleImportExcel}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          <Button onClick={() => fileInputRef.current?.click()}>Import Excel</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : (
            <table className="min-w-full border text-xs">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col} className="border px-2 py-1 bg-gray-100 text-left">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center p-4 text-red-600 font-semibold">
                      No data found for this period. Please check your import and date selection.<br />
                      <span className="text-xs font-normal text-gray-700">
                        (Checked range: {`${year}-${month.toString().padStart(2, '0')}-01`} to {`${year}-${month.toString().padStart(2, '0')}-31`}<br />
                        Company ID: {currentCompany?.id})
                      </span>
                    </td>
                  </tr>
                ) : reportData.map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td className="border px-2 py-1">{teamLookup[row.team_id] || 'Unknown'}</td>
                    <td className="border px-2 py-1">{userLookup[row.user_id] || 'Unknown'}</td>
                    <td className="border px-2 py-1">{row.monster}</td>
                    <td className="border px-2 py-1">{row.dice}</td>
                    <td className="border px-2 py-1">{row.linkedin_profiles_viewed}</td>
                    <td className="border px-2 py-1">{row.linkedin_inmails_sent}</td>
                    <td className="border px-2 py-1">{row.total_calls}</td>
                    <td className="border px-2 py-1">{row.total_call_duration}</td>
                    <td className="border px-2 py-1">{row.total_submissions}</td>
                    <td className="border px-2 py-1">{row.total_interviews}</td>
                    <td className="border px-2 py-1">{row.offers}</td>
                    <td className="border px-2 py-1">{row.starts}</td>
                    <td className="border px-2 py-1">{row.placed}</td>
                    <td className="border px-2 py-1">{row.offered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Import Mode Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Excel Data</DialogTitle>
            </DialogHeader>
            <div className="mb-4">How would you like to import the data for {getMonthOptions().find(m => m.value === month)?.label} {year}?</div>
            <div className="flex gap-4">
              <Button onClick={() => { setImportMode('replace'); processImport('replace'); }}>Replace All</Button>
              <Button onClick={() => { setImportMode('upsert'); processImport('upsert'); }}>Upsert Only</Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Imported Data</DialogTitle>
            </DialogHeader>
            {importErrors.length > 0 && (
              <div className="mb-2 text-red-600 text-sm">
                {importErrors.map((err, i) => <div key={i}>{err}</div>)}
              </div>
            )}
            <div className="overflow-x-auto max-h-96 mb-4">
              <table className="min-w-full border text-xs">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Team</th>
                    <th className="border px-2 py-1">USER NAME</th>
                    <th className="border px-2 py-1">Monster</th>
                    <th className="border px-2 py-1">Dice</th>
                    <th className="border px-2 py-1">LinkedIn Profiles viewed</th>
                    <th className="border px-2 py-1">LinkedIn InMails sent</th>
                    <th className="border px-2 py-1">Total Calls</th>
                    <th className="border px-2 py-1">Total Call Duration</th>
                    <th className="border px-2 py-1">Total Submissions</th>
                    <th className="border px-2 py-1">Total Interviews</th>
                    <th className="border px-2 py-1">Offers</th>
                    <th className="border px-2 py-1">Starts</th>
                    <th className="border px-2 py-1">Placed</th>
                    <th className="border px-2 py-1">Offered</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1">
                        <input
                          className="w-32 border rounded px-1"
                          value={row.team}
                          onChange={e => handleReviewEdit(idx, 'team', e.target.value)}
                        />
                        {!row.team_id && <span className="text-xs text-red-600 ml-1">!</span>}
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          className="w-32 border rounded px-1"
                          value={row.user}
                          onChange={e => handleReviewEdit(idx, 'user', e.target.value)}
                        />
                        {!row.user_id && (
                          <>
                            <span className="text-xs text-red-600 ml-1">!</span>
                            <Button size="sm" variant="outline" onClick={() => handleAddEmployeeClick(idx)} disabled={addEmployeeIdx === idx}>Add Employee</Button>
                          </>
                        )}
                        {addEmployeeIdx === idx && (
                          <div className="mt-2 p-2 border rounded bg-gray-50">
                            <div className="mb-1">
                              <label>Name:</label>
                              <input className="w-full border rounded px-1" value={addEmployeeForm.name} onChange={e => handleAddEmployeeFormChange('name', e.target.value)} />
                            </div>
                            <div className="mb-1">
                              <label>Email:</label>
                              <input className="w-full border rounded px-1" value={addEmployeeForm.email} onChange={e => handleAddEmployeeFormChange('email', e.target.value)} />
                            </div>
                            <div className="mb-1">
                              <label>Team:</label>
                              <select className="w-full border rounded px-1" value={addEmployeeForm.team_id} onChange={e => handleAddEmployeeFormChange('team_id', e.target.value)}>
                                <option value="">Select team</option>
                                {Object.entries(teamLookup).map(([id, name]) => (
                                  <option key={id} value={id}>{name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="mb-1">
                              <label>Role:</label>
                              <select className="w-full border rounded px-1" value={addEmployeeForm.role} onChange={e => handleAddEmployeeFormChange('role', e.target.value)}>
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                                <option value="reporting_manager">Reporting Manager</option>
                              </select>
                            </div>
                            <div className="mb-1">
                              <label>Position:</label>
                              <input className="w-full border rounded px-1" value={addEmployeeForm.position} onChange={e => handleAddEmployeeFormChange('position', e.target.value)} />
                            </div>
                            <div className="mb-1">
                              <label>Status:</label>
                              <select className="w-full border rounded px-1" value={addEmployeeForm.status} onChange={e => handleAddEmployeeFormChange('status', e.target.value)}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                            {addEmployeeForm.error && <div className="text-xs text-red-600 mb-1">{addEmployeeForm.error}</div>}
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" onClick={handleAddEmployeeSave} disabled={addEmployeeForm.loading}>{addEmployeeForm.loading ? 'Saving...' : 'Save'}</Button>
                              <Button size="sm" variant="outline" onClick={() => setAddEmployeeIdx(null)} disabled={addEmployeeForm.loading}>Cancel</Button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.monster} onChange={e => handleReviewEdit(idx, 'monster', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.dice} onChange={e => handleReviewEdit(idx, 'dice', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.linkedin_profiles_viewed} onChange={e => handleReviewEdit(idx, 'linkedin_profiles_viewed', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.linkedin_inmails_sent} onChange={e => handleReviewEdit(idx, 'linkedin_inmails_sent', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.total_calls} onChange={e => handleReviewEdit(idx, 'total_calls', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-20 border rounded px-1" value={row.total_call_duration} onChange={e => handleReviewEdit(idx, 'total_call_duration', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.total_submissions} onChange={e => handleReviewEdit(idx, 'total_submissions', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.total_interviews} onChange={e => handleReviewEdit(idx, 'total_interviews', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.offers} onChange={e => handleReviewEdit(idx, 'offers', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.starts} onChange={e => handleReviewEdit(idx, 'starts', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.placed} onChange={e => handleReviewEdit(idx, 'placed', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-12 border rounded px-1" value={row.offered} onChange={e => handleReviewEdit(idx, 'offered', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4 mt-2">
              <Button onClick={handleSaveImport} disabled={saving || importErrors.length > 0}>{saving ? 'Saving...' : 'Save to Supabase'}</Button>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={saving}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PerformanceReport; 