import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { CheckCircle, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Search, Upload, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { leaveDurationsConflict } from '@/utils/leaveDuration';

interface BulkLeaveImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onImportComplete?: () => void;
}

type ImportField = 'employeeName' | 'leaveType' | 'startDate' | 'endDate' | 'duration' | 'session' | 'reason';
type ResultStatus = 'inserted' | 'skipped' | 'failed';

type ImportRow = {
  rowNumber: number;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  duration: string;
  session: string;
  reason: string;
  employeeId?: string;
  leaveTypeId?: string;
  durationType?: 'full_day' | 'half_day';
  totalDays?: number;
  error?: string;
};

type ImportResult = ImportRow & { status: ResultStatus };

const fields: Array<{ key: ImportField; label: string; required: boolean }> = [
  { key: 'employeeName', label: 'Employee Name', required: true },
  { key: 'leaveType', label: 'Leave Type', required: false },
  { key: 'startDate', label: 'Start Date', required: true },
  { key: 'endDate', label: 'End Date', required: false },
  { key: 'duration', label: 'Duration', required: true },
  { key: 'session', label: 'Session', required: false },
  { key: 'reason', label: 'Reason', required: true },
];

const emptyMapping = (): Record<ImportField, string> => ({
  employeeName: '',
  leaveType: '',
  startDate: '',
  endDate: '',
  duration: '',
  session: '',
  reason: '',
});

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const parseDateValue = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return format(value, 'yyyy-MM-dd');
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 20000 && serial < 80000) {
      const date = XLSX.SSF.parse_date_code(serial);
      if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : format(parsed, 'yyyy-MM-dd');
};

const parseDuration = (value: string) => {
  const normalized = value.replace(/days?/i, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const autoMap = (headers: string[]): Record<ImportField, string> => {
  const result = emptyMapping();
  const aliases: Record<ImportField, string[]> = {
    employeeName: ['employee name', 'employee', 'name', 'staff name'],
    leaveType: ['leave type', 'leave', 'type'],
    startDate: ['start date', 'from date', 'from', 'leave date', 'date'],
    endDate: ['end date', 'to date', 'to'],
    duration: ['duration', 'total days', 'days', 'leave duration'],
    session: ['session', 'half day session', 'half'],
    reason: ['reason', 'remarks', 'comment', 'comments'],
  };
  fields.forEach(field => {
    result[field.key] = headers.find(header => aliases[field.key].includes(normalize(header))) || '';
  });
  return result;
};

const BulkLeaveImportWizard: React.FC<BulkLeaveImportWizardProps> = ({ open, onOpenChange, companyId, onImportComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'review' | 'report'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<ImportField, string>>(emptyMapping());
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; is_active: boolean | null }[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<{ id: string; name: string }[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | ResultStatus>('all');
  const [reportSearch, setReportSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('upload');
    setHeaders([]);
    setRawRows([]);
    setMapping(emptyMapping());
    setRows([]);
    setResults([]);
    setFileName('');
    setReportFilter('all');
    setReportSearch('');

    const loadLookups = async () => {
      setLoadingLookups(true);
      // These narrow, company-scoped lookups are reused for every imported row.
      const [{ data: employeeData, error: employeeError }, { data: leaveTypeData, error: leaveTypeError }] = await Promise.all([
        supabase.from('employees').select('id, name, is_active').eq('company_id', companyId),
        supabase.from('leave_types').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
      ]);
      if (employeeError || leaveTypeError) {
        console.error('Error loading bulk leave import lookups:', employeeError || leaveTypeError);
      }
      setEmployees(employeeData || []);
      setLeaveTypes(leaveTypeData || []);
      setLoadingLookups(false);
    };
    loadLookups();
  }, [companyId, open]);

  const employeeMap = useMemo(() => new Map(employees.map(employee => [normalize(employee.name), employee])), [employees]);
  const leaveTypeMap = useMemo(() => new Map(leaveTypes.map(type => [normalize(type.name), type])), [leaveTypes]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const workbook = file.name.toLowerCase().endsWith('.csv')
      ? XLSX.read(await file.text(), { type: 'string' })
      : XLSX.read(await file.arrayBuffer());
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const importedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
    const importedHeaders = importedRows.length ? Object.keys(importedRows[0]) : [];
    setHeaders(importedHeaders);
    setRawRows(importedRows);
    setMapping(autoMap(importedHeaders));
    setStep('mapping');
  };

  const getMappedRows = (): ImportRow[] => rawRows.map((raw, index) => {
    const value = (field: ImportField) => raw[mapping[field]];
    const employeeName = String(value('employeeName') ?? '').trim();
    const importedLeaveType = String(value('leaveType') ?? '').trim();
    const startDate = parseDateValue(value('startDate'));
    const endDateValue = parseDateValue(value('endDate'));
    const duration = String(value('duration') ?? '').trim();
    const importedSession = normalize(value('session')).replace(/\s+/g, '_');
    const importedReason = String(value('reason') ?? '').trim();
    const reason = importedReason || 'Casual Leave';
    const numericDuration = parseDuration(duration);
    const employee = employeeMap.get(normalize(employeeName));
    const defaultLeaveType = leaveTypeMap.get('casual leave');
    const type = leaveTypeMap.get(normalize(importedLeaveType)) || (!importedLeaveType ? defaultLeaveType : undefined);
    const leaveType = importedLeaveType || (type ? type.name : 'Casual Leave');
    const durationType = numericDuration === 0.5 ? 'half_day' : 'full_day';
    const session = durationType === 'half_day' ? importedSession || 'first_half' : '';
    const endDate = durationType === 'half_day' ? startDate : endDateValue;
    let error = '';

    if (!employeeName || !employee) error = `Employee name does not match the company roster`;
    else if (!type) error = importedLeaveType
      ? 'Leave type does not match an active leave type'
      : 'Default leave type Casual Leave is not configured as an active leave type';
    else if (!startDate) error = 'Start Date is required and must be a valid date';
    else if (!numericDuration || numericDuration < 0.5) error = 'Duration must be at least 0.5';
    else if (durationType === 'half_day' && !['first_half', 'second_half'].includes(session)) error = 'Session must be first_half or second_half';
    else if (durationType === 'full_day' && !endDate) error = 'End Date is required for full-day leave';
    else if (endDate && endDate < startDate) error = 'End Date cannot be before Start Date';

    return {
      rowNumber: index + 2,
      employeeName,
      leaveType,
      startDate,
      endDate,
      duration,
      session,
      reason,
      employeeId: employee?.id,
      leaveTypeId: type?.id,
      durationType,
      totalDays: numericDuration,
      error,
    };
  });

  const validateRows = () => {
    const mappedRows = getMappedRows();
    setRows(mappedRows);
    setStep('review');
  };

  const processImport = async () => {
    const validRows = rows.filter(row => !row.error && row.employeeId && row.leaveTypeId);
    if (!validRows.length) return;
    setProcessing(true);
    const nextResults: ImportResult[] = rows.filter(row => row.error).map(row => ({ ...row, status: 'failed' }));
    try {
      const minDate = validRows.reduce((value, row) => row.startDate < value ? row.startDate : value, validRows[0].startDate);
      const maxDate = validRows.reduce((value, row) => row.endDate > value ? row.endDate : value, validRows[0].endDate);
      const employeeIds = [...new Set(validRows.map(row => row.employeeId as string))];
      // One conflict query covers the import range and avoids one request per row.
      const { data: existingLeaves, error: existingError } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date, total_days, duration_type, session, status')
        .eq('company_id', companyId)
        .in('employee_id', employeeIds)
        .neq('status', 'rejected')
        .lte('start_date', maxDate)
        .gte('end_date', minDate);
      if (existingError) throw existingError;

      const availableRows: ImportRow[] = [];
      validRows.forEach(row => {
        const existingConflict = (existingLeaves || []).some(existing =>
          existing.employee_id === row.employeeId && leaveDurationsConflict(existing, {
            start_date: row.startDate,
            end_date: row.endDate,
            total_days: row.totalDays,
            duration_type: row.durationType,
            session: row.session || null,
          })
        );
        const importedConflict = availableRows.some(existing =>
          existing.employeeId === row.employeeId && leaveDurationsConflict(existing, {
            start_date: row.startDate,
            end_date: row.endDate,
            total_days: row.totalDays,
            duration_type: row.durationType,
            session: row.session || null,
          })
        );
        const conflict = existingConflict || importedConflict;
        if (conflict) nextResults.push({ ...row, status: 'skipped', error: 'Overlaps an existing or imported leave' });
        else availableRows.push(row);
      });

      for (let index = 0; index < availableRows.length; index += 100) {
        const batch = availableRows.slice(index, index + 100);
        const { error: insertError } = await supabase.from('leave_requests').insert(batch.map(row => ({
          employee_id: row.employeeId,
          company_id: companyId,
          leave_type_id: row.leaveTypeId,
          start_date: row.startDate,
          end_date: row.endDate,
          total_days: row.totalDays,
          duration_type: row.durationType,
          session: row.durationType === 'half_day' ? row.session : null,
          reason: row.reason,
          status: 'pending',
        })));
        if (insertError) {
          nextResults.push(...batch.map(row => ({ ...row, status: 'failed' as const, error: insertError.message })));
        } else {
          nextResults.push(...batch.map(row => ({ ...row, status: 'inserted' as const })));
        }
      }
      setResults(nextResults.sort((a, b) => a.rowNumber - b.rowNumber));
      setStep('report');
      onImportComplete?.();
    } catch (importError) {
      console.error('Bulk leave import failed:', importError);
      setResults(rows.map(row => ({ ...row, status: row.error ? 'failed' : 'failed', error: row.error || 'Import failed before this record was inserted' })));
      setStep('report');
    } finally {
      setProcessing(false);
    }
  };

  const filteredResults = results.filter(result => {
    const matchesStatus = reportFilter === 'all' || result.status === reportFilter;
    const query = normalize(reportSearch);
    const matchesSearch = !query || normalize(result.employeeName).includes(query) || normalize(result.leaveType).includes(query) || normalize(result.error).includes(query);
    return matchesStatus && matchesSearch;
  });

  const updateMapping = (field: ImportField, value: string) => setMapping(current => ({ ...current, [field]: value === '__none__' ? '' : value }));
  const requiredMappingMissing = fields.some(field => field.required && !mapping[field.key]);
  const insertedCount = results.filter(result => result.status === 'inserted').length;
  const skippedCount = results.filter(result => result.status === 'skipped').length;
  const failedCount = results.filter(result => result.status === 'failed').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Bulk Import Leave Requests</DialogTitle></DialogHeader>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {['upload', 'mapping', 'review', 'report'].map((item, index) => <React.Fragment key={item}><Badge variant={step === item ? 'default' : 'secondary'}>{index + 1}. {item[0].toUpperCase() + item.slice(1)}</Badge>{index < 3 && <ChevronRight className="h-3 w-3" />}</React.Fragment>)}
        </div>

        {step === 'upload' && (
          <div className="space-y-5 py-6">
            <Card><CardContent className="space-y-3 p-6 text-sm"><p>Upload an Excel or CSV file. Required fields are Employee Name, Start Date, and Duration.</p><p>Leave Type defaults to <strong>Casual Leave</strong> when blank. Reason defaults to <strong>Casual Leave</strong> when blank. Use Duration <strong>0.5</strong> for a half-day. If Session is blank, it defaults to <strong>first_half</strong>; otherwise use <strong>first_half</strong> or <strong>second_half</strong>.</p><p>Matching employees may be active or inactive.</p></CardContent></Card>
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={event => event.target.files?.[0] && handleFile(event.target.files[0])} />
            <Button onClick={() => inputRef.current?.click()} disabled={loadingLookups}><Upload className="mr-2 h-4 w-4" />{loadingLookups ? 'Loading company data...' : 'Choose Excel or CSV'}</Button>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">File: {fileName}. Map each source column to the matching Submit Leave Request field.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map(field => <div key={field.key} className="space-y-1"><Label>{field.label}{field.required ? ' *' : ''}</Label><Select value={mapping[field.key] || '__none__'} onValueChange={value => updateMapping(field.key, value)}><SelectTrigger><SelectValue placeholder="Not mapped" /></SelectTrigger><SelectContent><SelectItem value="__none__">Not mapped</SelectItem>{headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}</SelectContent></Select></div>)}
            </div>
            <div className="flex justify-between"><Button variant="outline" onClick={() => setStep('upload')}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><Button onClick={validateRows} disabled={requiredMappingMissing}>Preview {rawRows.length} rows<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2"><Badge variant="secondary">Rows: {rows.length}</Badge><Badge variant="default">Ready: {rows.filter(row => !row.error).length}</Badge><Badge variant="destructive">Invalid: {rows.filter(row => row.error).length}</Badge></div>
            <div className="max-h-[45vh] overflow-auto rounded border"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-2 text-left">Row</th><th className="p-2 text-left">Employee</th><th className="p-2 text-left">Leave type</th><th className="p-2 text-left">Dates</th><th className="p-2 text-left">Duration</th><th className="p-2 text-left">Result</th></tr></thead><tbody>{rows.map(row => <tr key={row.rowNumber} className="border-t"><td className="p-2">{row.rowNumber}</td><td className="p-2">{row.employeeName}</td><td className="p-2">{row.leaveType}</td><td className="p-2">{row.startDate}{row.endDate ? ` - ${row.endDate}` : ''}</td><td className="p-2">{row.totalDays} {row.durationType === 'half_day' ? `(${row.session})` : ''}</td><td className="p-2">{row.error ? <span className="text-destructive">{row.error}</span> : <span className="text-green-700">Ready</span>}</td></tr>)}</tbody></table></div>
            <div className="flex justify-between"><Button variant="outline" onClick={() => setStep('mapping')}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><Button onClick={processImport} disabled={processing || !rows.some(row => !row.error)}>{processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}Import valid rows</Button></div>
          </div>
        )}

        {step === 'report' && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-700">{insertedCount}</div><div className="text-sm text-muted-foreground">Inserted</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-2xl font-bold text-orange-700">{skippedCount}</div><div className="text-sm text-muted-foreground">Skipped</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-2xl font-bold text-red-700">{failedCount}</div><div className="text-sm text-muted-foreground">Failed</div></CardContent></Card></div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={reportSearch} onChange={event => setReportSearch(event.target.value)} placeholder="Search report" className="pl-9" /></div><Select value={reportFilter} onValueChange={value => setReportFilter(value as 'all' | ResultStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All results</SelectItem><SelectItem value="inserted">Inserted</SelectItem><SelectItem value="skipped">Skipped</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select></div>
            <div className="max-h-[45vh] overflow-auto rounded border"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-2 text-left">Row</th><th className="p-2 text-left">Employee</th><th className="p-2 text-left">Leave type</th><th className="p-2 text-left">Dates</th><th className="p-2 text-left">Duration</th><th className="p-2 text-left">Reason</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Details</th></tr></thead><tbody>{filteredResults.map(result => <tr key={`${result.rowNumber}-${result.status}`} className="border-t"><td className="p-2">{result.rowNumber}</td><td className="p-2">{result.employeeName}</td><td className="p-2">{result.leaveType}</td><td className="p-2">{result.startDate}{result.endDate ? ` - ${result.endDate}` : ''}</td><td className="p-2">{result.totalDays}{result.durationType === 'half_day' ? ` (${result.session})` : ' day(s)'}</td><td className="max-w-xs p-2">{result.reason || '-'}</td><td className="p-2">{result.status === 'inserted' ? <Badge><CheckCircle className="mr-1 h-3 w-3" />Inserted</Badge> : result.status === 'skipped' ? <Badge variant="secondary">Skipped</Badge> : <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>}</td><td className="p-2 text-muted-foreground">{result.error || 'Leave request created as pending'}</td></tr>)}</tbody></table></div>
            <div className="flex justify-end"><Button onClick={() => onOpenChange(false)}>Close</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkLeaveImportWizard;
