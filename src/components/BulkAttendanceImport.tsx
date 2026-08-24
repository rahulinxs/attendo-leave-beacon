import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, FileText, Table } from 'lucide-react';

interface BulkAttendanceImportProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  companyId: string;
  onImportComplete?: () => void;
}

interface ImportStats {
  processed: number;
  imported: number;
  updated: number;
  failed: number;
  unmatched: number;
}

interface AttendanceRecord {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  lateBy: string;
  earlyBy: string;
  totalHours: string;
  overtime: string;
  status: string;
}

interface ImportResult {
  record: AttendanceRecord;
  status: 'inserted' | 'updated' | 'preserved' | 'failed';
  error?: string;
  databaseRecord?: any;
}

const BulkAttendanceImport: React.FC<BulkAttendanceImportProps> = ({ open, setOpen, companyId, onImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'upsert' | null>(null);
  const [importPreview, setImportPreview] = useState<AttendanceRecord[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewData, setReviewData] = useState<AttendanceRecord[]>([]);
  const [fileType, setFileType] = useState<'excel' | 'csv'>('excel');
  const [employeeNameToId, setEmployeeNameToId] = useState<Record<string, string>>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<'replace' | 'upsert' | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ImportResult | null>(null);

  // Fetch employees for name matching (attendance table references employees.id)
  React.useEffect(() => {
    const fetchEmployees = async () => {
      if (!companyId) return;
      
      console.log('Fetching employees for company:', companyId);
      
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name, is_active')
        .eq('company_id', companyId);

      if (empError) {
        console.error('Error fetching employees:', empError);
        return;
      }

      const employeesList = employees || [];

      if (employeesList.length) {
        const nameToIdMap: Record<string, string> = {};
        employeesList.forEach(employee => {
          const employeeName = employee.name?.trim().toLowerCase() || '';
          if (employeeName) {
            nameToIdMap[employeeName] = employee.id;
          }
          console.log(`Mapping employee: "${employee.name}" (${employee.is_active ? 'active' : 'inactive'}) -> ${employee.id}`);
        });
        setEmployeeNameToId(nameToIdMap);
        console.log('Final name-to-id map:', nameToIdMap);
      }
    };

    fetchEmployees();
  }, [companyId]);

  const parseTimeString = (timeValue: string): { hours: number; minutes: number; seconds: number } | null => {
    if (!timeValue) return null;
    const normalized = timeValue.toString().trim();
    const matches = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?(?:\s*([AaPp][Mm]))?$/);
    if (!matches) return null;

    let hours = parseInt(matches[1], 10);
    const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
    const seconds = matches[3] ? parseInt(matches[3], 10) : 0;
    const period = matches[4]?.toUpperCase();

    if (period) {
      if (period === 'PM' && hours < 12) {
        hours += 12;
      }
      if (period === 'AM' && hours === 12) {
        hours = 0;
      }
    }

    if (!period && hours >= 0 && hours <= 23) {
      // keep as 24-hour time
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      return null;
    }

    return { hours, minutes, seconds };
  };

  const toIsoDateTime = (baseDate: Date, timeValue: string): string | null => {
    const parsed = parseTimeString(timeValue);
    if (!parsed) return null;
    const date = new Date(baseDate);
    date.setHours(parsed.hours, parsed.minutes, parsed.seconds, 0);
    return date.toISOString();
  };

  const normalizeStatus = (value: string): string => {
    const normalized = (value || '').toString().trim().toLowerCase();

    if (['p', 'present', '✓'].includes(normalized)) return 'present';
    if (['a', 'absent', 'x'].includes(normalized)) return 'absent';
    if (['late', 'l'].includes(normalized)) return 'late';
    if (['hd', 'half_day', 'half day'].includes(normalized)) return 'half_day';
    if (['wfh', 'work_from_home', 'work from home', 'remote'].includes(normalized)) return 'work_from_home';
    if (['wo', 'wop', 'holiday', 'off'].includes(normalized)) return 'holiday';

    return normalized || 'present';
  };

  const getRecordCompletenessScore = (record: AttendanceRecord) => {
    let score = 0;
    if (record.checkIn?.trim()) score += 2;
    if (record.checkOut?.trim()) score += 2;
    if (record.status?.trim()) score += 1;
    if (record.date?.trim()) score += 1;
    return score;
  };

  const isRecordConsistent = (record: AttendanceRecord, baseDate: Date) => {
    if (!record.checkIn?.trim() || !record.checkOut?.trim()) return true;

    const checkIn = toIsoDateTime(baseDate, record.checkIn);
    const checkOut = toIsoDateTime(baseDate, record.checkOut);

    if (!checkIn || !checkOut) return false;

    return new Date(checkOut).getTime() >= new Date(checkIn).getTime();
  };

  const mergeAttendanceTimes = (existingRecord: any, importedCheckIn: string | null, importedCheckOut: string | null) => {
    const existingCheckIn = existingRecord?.check_in_time ? new Date(existingRecord.check_in_time).getTime() : null;
    const existingCheckOut = existingRecord?.check_out_time ? new Date(existingRecord.check_out_time).getTime() : null;
    const importedCheckInTime = importedCheckIn ? new Date(importedCheckIn).getTime() : null;
    const importedCheckOutTime = importedCheckOut ? new Date(importedCheckOut).getTime() : null;

    const mergedCheckIn = [existingCheckIn, importedCheckInTime].filter((value): value is number => value !== null && !Number.isNaN(value));
    const mergedCheckOut = [existingCheckOut, importedCheckOutTime].filter((value): value is number => value !== null && !Number.isNaN(value));

    return {
      check_in_time: mergedCheckIn.length ? new Date(Math.min(...mergedCheckIn)).toISOString() : importedCheckIn || existingRecord?.check_in_time || null,
      check_out_time: mergedCheckOut.length ? new Date(Math.max(...mergedCheckOut)).toISOString() : importedCheckOut || existingRecord?.check_out_time || null,
    };
  };

  const shouldUseImportedRecord = (existingRecord: any, importedRecord: AttendanceRecord, baseDate: Date) => {
    const hasExisting = Boolean(existingRecord?.id);

    if (!hasExisting) {
      return true;
    }

    const importedScore = getRecordCompletenessScore(importedRecord);
    const existingScore = getRecordCompletenessScore({
      ...importedRecord,
      checkIn: existingRecord?.check_in_time ? new Date(existingRecord.check_in_time).toTimeString().slice(0, 5) : '',
      checkOut: existingRecord?.check_out_time ? new Date(existingRecord.check_out_time).toTimeString().slice(0, 5) : '',
      status: existingRecord?.status || '',
      date: existingRecord?.date || ''
    });

    if (!isRecordConsistent(importedRecord, baseDate)) {
      return false;
    }

    if (!importedRecord.checkIn?.trim() && existingRecord?.check_in_time) {
      return false;
    }

    if (!importedRecord.checkOut?.trim() && existingRecord?.check_out_time) {
      return false;
    }

    return importedScore >= existingScore;
  };

  // Excel/CSV import handler
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    setImportDialogOpen(true);
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

    // Helper function to format Excel serial dates for display
    const formatDateForDisplay = (dateValue: any): string => {
      if (!dateValue) return '';
      
      const dateStr = dateValue.toString();
      
      // Handle Excel serial numbers (e.g., 46054, 46055)
      const serialNumber = parseInt(dateStr);
      if (!isNaN(serialNumber) && serialNumber > 40000 && serialNumber < 60000) {
        const excelEpoch = new Date(1900, 0, 1);
        const daysOffset = serialNumber - 2;
        const date = new Date(excelEpoch.getTime() + (daysOffset * 24 * 60 * 60 * 1000));
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          });
        }
      }
      
      // Handle "Month DD, YYYY" format (e.g., "January 01, 2026")
      if (dateStr.includes(',')) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          });
        }
      }
      
      return dateStr;
    };

    // Map Excel columns to DB fields using employee name only for matching within the current company
    const mapped = (json as any[]).map((row: any, index: number) => {
      // Debug: Log raw row data and all available columns
      if (index === 0) {
        console.log('Available columns in Excel:', Object.keys(row));
      }
      console.log(`Row ${index + 1} raw data:`, row);

      const employeeCode = row['Emp ID']?.toString().trim()
        || row['Employee Code']?.toString().trim()
        || row['EmpId']?.toString().trim()
        || '';
      const employeeName = row['Employee Name']?.toString().trim()
        || row['Name']?.toString().trim()
        || '';
      const normalizedName = employeeName.toLowerCase();
      const employeeId = normalizedName ? employeeNameToId[normalizedName] || '' : '';

      // Debug: Log individual field values
      console.log(`Row ${index + 1} parsed values:`, {
        employeeCode,
        employeeName,
        employeeId,
        date: row['Date'],
        checkIn: row['In Time'],
        checkOut: row['Out Time'],
        totalHours: row['Duration'],
        status: row['Status']
      });

      return {
        employeeId,
        employeeCode,
        employeeName,
        date: formatDateForDisplay(row['Date']),
        checkIn: row['In Time']?.toString() || '',
        checkOut: row['Out Time']?.toString() || '',
        lateBy: '', // Not available in this Excel format
        earlyBy: '', // Not available in this Excel format
        totalHours: row['Duration']?.toString() || '',
        overtime: '', // Not available in this Excel format
        status: row['Status']?.toString() || 'present'
      };
    });

    // Validate and collect errors
    const errors: string[] = [];
    mapped.forEach((row, idx) => {
      if (!row.employeeId) {
        const employeeReference = row.employeeName || row.employeeId || 'Unknown';
        errors.push(`Row ${idx + 1}: Employee '${employeeReference}' not found. Verify Employee Name against the company roster.`);
      }
      if (!row.date) {
        errors.push(`Row ${idx + 1}: Date is required.`);
      }
    });

    setImportPreview(mapped);
    setImportErrors(errors);
    setReviewDialogOpen(true);
    setReviewData(mapped);
    setReviewMode(mode);
  };

  // Save imported data to database
  const saveImport = async () => {
    if (!reviewData.length || !reviewMode) return;
    
    setImporting(true);
    let inserted = 0, updated = 0, fail = 0;
    const errors: string[] = [];
    const results: ImportResult[] = [];

    console.log('Starting import with', reviewData.length, 'records');
    console.log('Company ID:', companyId);

    // Validate company ID
    if (!companyId) {
      toast({
        title: 'Import Error',
        description: 'Company ID is missing. Please try again.',
        variant: 'destructive'
      });
      setImporting(false);
      return;
    }

    // Helper function to parse various date formats
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      
      // Handle Excel serial numbers (e.g., 46054, 46055)
      const serialNumber = parseInt(dateStr);
      if (!isNaN(serialNumber) && serialNumber > 40000 && serialNumber < 60000) {
        // Excel dates start from 1/1/1900, but Excel incorrectly treats 1900 as a leap year
        // So we need to adjust by 1 day for dates after 2/28/1900
        const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
        const daysOffset = serialNumber - 2; // Adjust for Excel's leap year bug
        const date = new Date(excelEpoch.getTime() + (daysOffset * 24 * 60 * 60 * 1000));
        if (!isNaN(date.getTime())) {
          console.log(`Parsed Excel serial ${dateStr} as ${date.toISOString()}`);
          return date;
        }
      }
      
      // Try MM/DD/YYYY format first (e.g., "2/25/2026")
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]);
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          
          if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
            const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
            if (!isNaN(date.getTime())) {
              console.log(`Parsed date ${dateStr} as ${date.toISOString()}`);
              return date;
            }
          }
        }
      }
      
      // Try "Month DD, YYYY" format (e.g., "January 01, 2026")
      if (dateStr.includes(',')) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          console.log(`Parsed date ${dateStr} as ${date.toISOString()}`);
          return date;
        }
      }
      
      // Try YYYY-MM-DD format (e.g., "2026-02-25")
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
              console.log(`Parsed date ${dateStr} as ${date.toISOString()}`);
              return date;
            }
          }
        }
      }
      
      // Fallback to standard Date parsing
      const fallbackDate = new Date(dateStr);
      if (!isNaN(fallbackDate.getTime())) {
        console.log(`Fallback parsed date ${dateStr} as ${fallbackDate.toISOString()}`);
        return fallbackDate;
      }
      
      return null;
    };

    try {
      for (const record of reviewData) {
        console.log('Processing record:', record);
        
        if (!record.employeeId) {
          const errorMsg = `Skipped ${record.employeeName} - employee not found in profiles table`;
          console.error(errorMsg);
          errors.push(errorMsg);
          fail++;
          continue;
        }

        // Additional validation for required fields
        if (!record.date || record.date.trim() === '') {
          const errorMsg = `Skipped ${record.employeeName} - date is required`;
          console.error(errorMsg);
          errors.push(errorMsg);
          fail++;
          continue;
        }

        // Convert times to ISO format
        let checkInTime: string | null = null;
        let checkOutTime: string | null = null;
        
        try {
          const baseDate = parseDate(record.date);
          if (baseDate) {
            if (record.checkIn && record.checkIn.trim()) {
              const parsedCheckIn = toIsoDateTime(baseDate, record.checkIn.toString().trim());
              if (parsedCheckIn) {
                checkInTime = parsedCheckIn;
                console.log(`Check-in time: ${record.checkIn} -> ${checkInTime}`);
              }
            }
            if (record.checkOut && record.checkOut.trim()) {
              const parsedCheckOut = toIsoDateTime(baseDate, record.checkOut.toString().trim());
              if (parsedCheckOut) {
                checkOutTime = parsedCheckOut;
                console.log(`Check-out time: ${record.checkOut} -> ${checkOutTime}`);
              }
            }
          }
        } catch (dateError) {
          console.error('Date conversion error:', dateError);
          errors.push(`Invalid date/time format for ${record.employeeName} on ${record.date}`);
          fail++;
          continue;
        }

        // Convert the parsed date to YYYY-MM-DD format for storage
        const parsedDate = parseDate(record.date);
        const formattedDate = parsedDate ? parsedDate.toISOString().split('T')[0] : record.date;

        // Validate status against schema constraints
        let validStatus = normalizeStatus(record.status);
        const allowedStatuses = ['present', 'absent', 'late', 'holiday', 'half_day', 'work_from_home'];

        if (!allowedStatuses.includes(validStatus)) {
          validStatus = 'present';
        }

        const attendanceData = {
          employee_id: record.employeeId,
          company_id: companyId, // This is NOT NULL in schema
          date: formattedDate,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          status: validStatus,
          notes: `Bulk import - Total Hours: ${record.totalHours}`,
          pending_approval: false, // Set to false for bulk imports
          requestor_role: null // Set to null for bulk imports
        };

        console.log('Inserting attendance data:', attendanceData);

        // Check if record exists to determine insert vs update
        const { data: existingRecord, error: checkError } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', record.employeeId)
          .eq('date', formattedDate)
          .single();

        let operationStatus: 'inserted' | 'updated' | 'preserved' | 'failed';
        let dbRecord = existingRecord;

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
          const errorMsg = `Check failed for ${record.employeeName} on ${record.date}: ${checkError.message}`;
          console.error('Database check error:', checkError);
          errors.push(errorMsg);
          fail++;
          operationStatus = 'failed';
        } else {
          const shouldReplace = shouldUseImportedRecord(existingRecord, record, parsedDate || new Date(record.date));

          if (!shouldReplace) {
            console.warn(`Preserving existing attendance for ${record.employeeName} on ${record.date} because the biometric import appears incomplete or unreliable.`);
            errors.push(`Preserved existing attendance for ${record.employeeName} on ${record.date} because the biometric record was incomplete or inconsistent.`);
            operationStatus = 'preserved';
            fail = Math.max(0, fail);
            results.push({
              record,
              status: 'preserved',
              error: 'Biometric record was not trusted for overwrite.',
              databaseRecord: existingRecord
            });
            continue;
          }

          if (reviewMode === 'replace') {
            const { error: deleteError } = await supabase
              .from('attendance')
              .delete()
              .match({
                employee_id: record.employeeId,
                date: formattedDate,
                company_id: companyId
              });

            if (deleteError) {
              console.warn(`Replace mode delete warning for ${record.employeeName} on ${record.date}:`, deleteError.message);
            }
          }

          const mergedAttendanceData = existingRecord
            ? {
                ...attendanceData,
                ...mergeAttendanceTimes(existingRecord, checkInTime, checkOutTime),
              }
            : attendanceData;

          const { error: upsertError } = await supabase.from('attendance').upsert(mergedAttendanceData, {
            onConflict: 'employee_id,date'
          });

          if (upsertError) {
            const errorMsg = `Import failed for ${record.employeeName} on ${record.date}: ${upsertError.message}`;
            console.error('Database error:', upsertError);
            errors.push(errorMsg);
            fail++;
            operationStatus = 'failed';
          } else {
            // Get the inserted/updated record
            const { data: resultRecord } = await supabase
              .from('attendance')
              .select('*')
              .eq('employee_id', record.employeeId)
              .eq('date', formattedDate)
              .single();
            
            dbRecord = resultRecord;
            
            if (existingRecord) {
              console.log('Successfully updated record for:', record.employeeName);
              updated++;
              operationStatus = 'updated';
            } else {
              console.log('Successfully inserted record for:', record.employeeName);
              inserted++;
              operationStatus = 'inserted';
            }
          }
        }

        // Track result for detailed report
        results.push({
          record,
          status: operationStatus,
          error: operationStatus === 'failed' ? errors[errors.length - 1] : undefined,
          databaseRecord: dbRecord
        });
      }

      setImportStats({
        processed: reviewData.length,
        imported: inserted,
        updated: updated,
        failed: fail,
        unmatched: errors.filter(e => e.includes('not found')).length
      });

      setImportResults(results);

      toast({
        title: 'Import Complete',
        description: `${inserted} inserted, ${updated} updated, ${fail} failed.`
      });

      setReviewDialogOpen(false);
      setImportFile(null);
      setImportMode(null);
      setImportPreview([]);
      setReviewData([]);
      setReportDialogOpen(true); // Show detailed report
      
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error: any) {
      toast({
        title: 'Import Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Attendance Import (Biometric)</DialogTitle>
          </DialogHeader>
          
          <div className="mb-4 space-y-4">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">File Type:</h3>
              <div className="flex gap-2">
                <Button
                  variant={fileType === 'excel' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFileType('excel')}
                  disabled={importing}
                >
                  <Table className="w-4 h-4 mr-2" />
                  Excel (.xlsx, .xls)
                </Button>
                <Button
                  variant={fileType === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFileType('csv')}
                  disabled={importing}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  CSV (.csv)
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <p><strong>Required Columns:</strong></p>
              <ul className="ml-4 list-disc">
                <li>Employee Name (required for matching within the current company)</li>
                <li>Emp ID / Employee Code (optional; may not correspond to database IDs in biometric exports)</li>
                <li>Date (YYYY-MM-DD format)</li>
                <li>Check In (HH:MM format)</li>
                <li>Check Out (HH:MM format)</li>
                <li>Late By (optional)</li>
                <li>Early By (optional)</li>
                <li>Total Hours (optional)</li>
                <li>Overtime (optional)</li>
                <li>Status (optional, defaults to 'present')</li>
              </ul>
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm">
                  <strong>Important:</strong> Employee matching uses <strong>Employee Name only</strong> within the current company.
                  Biometric file Emp IDs often do not match the app database ids, so name alignment is required.
                  Both <strong>active and inactive</strong> employees are included for historical data import.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="file"
                accept={fileType === 'csv' ? '.csv' : '.xlsx, .xls'}
                ref={fileInputRef}
                onChange={handleImportExcel}
                disabled={importing}
                className="flex-1"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                variant="gradient"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing ? 'Processing...' : 'Choose File'}
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Selected format: <strong>{fileType === 'csv' ? 'CSV' : 'Excel'}</strong> - 
              {fileType === 'csv' ? 'Accepts .csv files with comma-separated values' : 'Accepts .xlsx and .xls Excel files'}
            </p>
          </div>

          {importStats && (
            <div className="mb-4 text-sm text-gray-700 bg-blue-50 p-3 rounded">
              <div className="font-semibold mb-2">Import Statistics:</div>
              <ul className="ml-4 list-disc">
                <li>Total records processed: {importStats.processed}</li>
                <li>New records inserted: {importStats.imported}</li>
                <li>Existing records updated: {importStats.updated}</li>
                <li>Failed: {importStats.failed}</li>
                <li>Unmatched employees: {importStats.unmatched}</li>
              </ul>
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded max-h-32 overflow-y-auto">
              <div className="font-semibold mb-2">Import Errors:</div>
              <ul className="ml-4 list-disc">
                {importErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Mode Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Mode</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Choose how you want to import the data:</p>
            <div className="space-y-2">
              <div className="p-3 border rounded">
                <h4 className="font-semibold">Replace All</h4>
                <p className="text-sm text-gray-600">Delete existing attendance records and replace with imported data.</p>
              </div>
              <div className="p-3 border rounded">
                <h4 className="font-semibold">Upsert Only</h4>
                <p className="text-sm text-gray-600">Update existing records and add new ones without deleting anything.</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => { setImportMode('replace'); processImport('replace'); }}>
              Replace All
            </Button>
            <Button onClick={() => { setImportMode('upsert'); processImport('upsert'); }}>
              Upsert Only
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Import Data</DialogTitle>
          </DialogHeader>
          
          {importErrors.length > 0 && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
              <div className="font-semibold mb-2">Validation Errors:</div>
              <ul className="ml-4 list-disc">
                {importErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">
              Showing {reviewData.length} records to import
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-1 text-xs">Emp ID</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">Employee Name</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">Date</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">Check In</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">Check Out</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">Status</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">Total Hours</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className={row.employeeId ? '' : 'bg-red-50'}>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{row.employeeCode || '-'}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">
                        {row.employeeName}
                        {!row.employeeId && <span className="text-red-500 ml-1"> (Not found)</span>}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{row.date}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{row.checkIn}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{row.checkOut}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{row.status}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{row.totalHours}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{row.overtime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reviewData.length > 10 && (
                <div className="text-sm text-gray-500 mt-2">
                  ... and {reviewData.length - 10} more records
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={saveImport} disabled={importing}>
              {importing ? 'Importing...' : 'Confirm Import'}
            </Button>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mini Import Report Dashboard */}
      {reportDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Import Report Dashboard</h2>
                <button
                  onClick={() => setReportDialogOpen(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-5 gap-3">
                <div className="bg-green-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-700">{importStats?.imported || 0}</div>
                  <div className="text-xs text-green-600">New</div>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-700">{importStats?.updated || 0}</div>
                  <div className="text-xs text-blue-600">Updated</div>
                </div>
                <div className="bg-red-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-700">{importStats?.failed || 0}</div>
                  <div className="text-xs text-red-600">Failed</div>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-700">{importStats?.unmatched || 0}</div>
                  <div className="text-xs text-yellow-600">Unmatched</div>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-700">{importStats?.processed || 0}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Results</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filteredResults = importResults.filter(r => r.status === 'inserted');
                      console.log('Inserted records:', filteredResults);
                    }}
                    className="text-xs px-2 py-1"
                  >
                    New ({importResults.filter(r => r.status === 'inserted').length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filteredResults = importResults.filter(r => r.status === 'updated');
                      console.log('Updated records:', filteredResults);
                    }}
                    className="text-xs px-2 py-1"
                  >
                    Updated ({importResults.filter(r => r.status === 'updated').length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filteredResults = importResults.filter(r => r.status === 'failed');
                      console.log('Failed records:', filteredResults);
                    }}
                    className="text-xs px-2 py-1"
                  >
                    Failed ({importResults.filter(r => r.status === 'failed').length})
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-auto" style={{maxHeight: '300px'}}>
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Status</th>
                    <th className="px-2 py-1 text-left">Employee</th>
                    <th className="px-2 py-1 text-left">Date</th>
                    <th className="px-2 py-1 text-left">Check In</th>
                    <th className="px-2 py-1 text-left">Check Out</th>
                    <th className="px-2 py-1 text-left">Hours</th>
                    <th className="px-2 py-1 text-left">DB ID</th>
                    <th className="px-2 py-1 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {importResults.map((result, idx) => (
                    <tr key={idx} className={`border-b ${
                      result.status === 'inserted' ? 'bg-green-50' :
                      result.status === 'updated' ? 'bg-blue-50' :
                      'bg-red-50'
                    } hover:bg-opacity-80`}>
                      <td className="px-2 py-1">
                        <span className={`px-1 py-0.5 rounded text-xs font-semibold ${
                          result.status === 'inserted' ? 'bg-green-200 text-green-800' :
                          result.status === 'updated' ? 'bg-blue-200 text-blue-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {result.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1 truncate max-w-[100px]">{result.record.employeeName}</td>
                      <td className="px-2 py-1">{result.record.date}</td>
                      <td className="px-2 py-1">{result.record.checkIn}</td>
                      <td className="px-2 py-1">{result.record.checkOut}</td>
                      <td className="px-2 py-1">{result.record.totalHours}</td>
                      <td className="px-2 py-1 font-mono text-xs">
                        {result.databaseRecord?.id ? result.databaseRecord.id.slice(0, 8) + '...' : 'N/A'}
                      </td>
                      <td className="px-2 py-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRecord(result)}
                          disabled={!result.databaseRecord}
                          className="text-xs px-1 py-0.5"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-gray-50 border-t flex justify-between">
              <div className="text-sm text-gray-600">
                {importResults.length} records processed
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Export results to Excel
                    const exportData = importResults.map(result => ({
                      'Status': result.status,
                      'Employee Name': result.record.employeeName,
                      'Date': result.record.date,
                      'Check In': result.record.checkIn,
                      'Check Out': result.record.checkOut,
                      'Total Hours': result.record.totalHours,
                      'Database ID': result.databaseRecord?.id || 'N/A',
                      'Error': result.error || 'None'
                    }));
                    
                    const ws = XLSX.utils.json_to_sheet(exportData);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'ImportReport');
                    XLSX.writeFile(wb, `import_report_${new Date().toISOString().split('T')[0]}.xlsx`);
                  }}
                  className="text-xs"
                >
                  Export Excel
                </Button>
                <Button 
                  variant="gradient"
                  size="sm"
                  onClick={() => setReportDialogOpen(false)}
                  className="text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini Record Details Dialog */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Record Details</h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Status and DB ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Status</label>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${
                    selectedRecord.status === 'inserted' ? 'bg-green-200 text-green-800' :
                    selectedRecord.status === 'updated' ? 'bg-blue-200 text-blue-800' :
                    'bg-red-200 text-red-800'
                  }`}>
                    {selectedRecord.status.toUpperCase()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Database ID</label>
                  <div className="font-mono text-xs">{selectedRecord.databaseRecord?.id ? selectedRecord.databaseRecord.id.slice(0, 8) + '...' : 'N/A'}</div>
                </div>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Employee</label>
                  <div className="text-xs">{selectedRecord.record.employeeName}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Date</label>
                  <div className="text-xs">{selectedRecord.record.date}</div>
                </div>
              </div>

              {/* Time Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Check In</label>
                  <div className="text-xs">{selectedRecord.record.checkIn || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Check Out</label>
                  <div className="text-xs">{selectedRecord.record.checkOut || 'N/A'}</div>
                </div>
              </div>

              {/* Hours and Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Total Hours</label>
                  <div className="text-xs">{selectedRecord.record.totalHours || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Attendance Status</label>
                  <div className="text-xs">{selectedRecord.record.status}</div>
                </div>
              </div>

              {/* Error Message */}
              {selectedRecord.error && (
                <div>
                  <label className="text-xs font-semibold text-gray-600">Error</label>
                  <div className="bg-red-50 p-2 rounded text-xs text-red-700">
                    {selectedRecord.error}
                  </div>
                </div>
              )}

              {/* Database Record (collapsed) */}
              {selectedRecord.databaseRecord && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold text-gray-600 hover:text-gray-800">
                    View Full Database Record
                  </summary>
                  <div className="bg-gray-50 p-2 rounded mt-1 font-mono text-xs max-h-32 overflow-auto">
                    <pre>{JSON.stringify(selectedRecord.databaseRecord, null, 2)}</pre>
                  </div>
                </details>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 border-t">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setSelectedRecord(null)}
                className="w-full text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkAttendanceImport;
