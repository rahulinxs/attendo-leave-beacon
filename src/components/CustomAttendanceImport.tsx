import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { FileText, Table } from 'lucide-react';

interface CustomAttendanceImportProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  companyId: string;
  onImportComplete?: () => void;
}

interface ImportStats {
  processed: number;
  imported: number;
  failed: number;
  unmatched: number;
  multiple: number;
  skipped: number;
}

interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  date: string;
  day: string;
  status: string;
  inTime?: string;
  outTime?: string;
  duration?: string;
  sourceFile: string;
}

const CustomAttendanceImport: React.FC<CustomAttendanceImportProps> = ({ 
  open, 
  setOpen, 
  companyId, 
  onImportComplete 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [fileType, setFileType] = useState<'excel' | 'csv'>('excel');

  // Date format converter for DD-MMM-YY to YYYY-MM-DD
  const convertCustomDate = (dateStr: string): string => {
    try {
      // Handle DD-MMM-YY format (e.g., "28-Jan-26")
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1];
        const year = '20' + parts[2]; // Convert 26 to 2026
        
        const monthMap: Record<string, string> = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        
        const monthNum = monthMap[month] || month;
        return `${year}-${monthNum}-${day}`;
      }
      return dateStr;
    } catch (error) {
      console.error('Date conversion error:', error);
      return dateStr;
    }
  };

  // Time format converter for HH:MM:SS to ISO string
  const convertCustomTime = (timeStr: string, dateStr: string): string => {
    try {
      if (!timeStr || timeStr.trim() === '') return '';
      
      // Parse HH:MM:SS format
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      const date = new Date(dateStr);
      date.setHours(hours, minutes || 0, seconds || 0, 0);
      return date.toISOString();
    } catch (error) {
      console.error('Time conversion error:', error);
      return '';
    }
  };

  // Status mapper for different status codes
  const mapStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'P': 'present',
      'A': 'absent',
      'L': 'late',
      'H': 'half_day',
      'HD': 'half_day',
      'HOLIDAY': 'holiday',
      'LEAVE': 'absent',
      'WEEKEND': 'holiday'
    };
    return statusMap[status?.toUpperCase()] || 'present';
  };

  // Main mapping function
  const mapAttendanceData = (row: any): AttendanceRecord | null => {
    try {
      return {
        employeeId: row['Employee ID']?.toString() || '',
        employeeName: row['Employee Name']?.toString()?.trim() || '',
        date: convertCustomDate(row['Date']?.toString() || ''),
        day: row['Day']?.toString() || '',
        status: mapStatus(row['Status']?.toString() || ''),
        inTime: row['In Time']?.toString() || '',
        outTime: row['Out Time']?.toString() || '',
        duration: row['Duration']?.toString() || '',
        sourceFile: row['Source File']?.toString() || ''
      };
    } catch (error) {
      console.error('Row mapping error:', error);
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    setImportErrors([]);
    setImportStats(null);

    try {
      // Detect file type and set accordingly
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'csv') {
        setFileType('csv');
      } else if (['xlsx', 'xls'].includes(extension || '')) {
        setFileType('excel');
      }

      let json: any[] = [];

      if (fileType === 'csv' || extension === 'csv') {
        // Handle CSV file
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV file appears to be empty or invalid');
        }

        // Improved CSV parsing to handle quoted fields
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          
          result.push(current.trim());
          return result;
        };

        // Parse CSV headers
        const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"(.*)"$/, '$1'));
        
        // Parse CSV rows
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue; // Skip empty lines
          
          const values = parseCSVLine(lines[i]);
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          json.push(row);
        }
      } else {
        // Handle Excel file
        const workbook = await XLSX.read(await file.arrayBuffer());
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        json = XLSX.utils.sheet_to_json(worksheet);
      }
      
      let success = 0, fail = 0, skip = 0;
      const errors: string[] = [];
      const processedRecords: AttendanceRecord[] = [];

      // Fetch active employees for name matching
      console.log('Fetching employees for company:', companyId);
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('is_active', true);

      console.log('Employees fetch result:', { employees, empError });

      if (empError || !employees) {
        const errorMessage = `Could not fetch employee list: ${empError?.message || 'Unknown error'}`;
        console.error('Employee fetch error:', empError);
        
        // Set persistent error
        setImportErrors([errorMessage]);
        
        // Show persistent toast
        toast({ 
          title: 'Employee Fetch Error', 
          description: errorMessage,
          variant: 'destructive',
          duration: 10000 // Keep toast visible for 10 seconds
        });
        
        setImporting(false);
        return;
      }

      // Process each row
      for (const row of json as any[]) {
        const mappedRecord = mapAttendanceData(row);
        
        if (!mappedRecord) {
          errors.push(`Failed to map row: ${JSON.stringify(row)}`);
          fail++;
          continue;
        }

        // Skip records without essential data
        if (!mappedRecord.employeeName || !mappedRecord.date) {
          errors.push(`Missing Employee Name or Date in row: ${JSON.stringify(row)}`);
          fail++;
          continue;
        }

        // Skip records with no time data (like holidays/weekends)
        if (!mappedRecord.inTime && !mappedRecord.outTime) {
          skip++;
          continue;
        }

        processedRecords.push(mappedRecord);
      }

      // Import processed records
      for (const record of processedRecords) {
        // Match by employee name (primary method since Employee ID won't match database format)
        let matchedEmployee = employees.find(emp => 
          emp.name?.trim().toLowerCase() === record.employeeName.toLowerCase()
        );

        // If no match found, try to match with employees table as fallback
        if (!matchedEmployee) {
          console.log(`No employee found in employees table for: ${record.employeeName}, checking employees table again...`);
          
          // Try to fetch from employees table as fallback
          const { data: fallbackEmployees, error: employeeError } = await supabase
            .from('employees')
            .select('id, name')
            .eq('company_id', companyId)
            .ilike('name', `%${record.employeeName}%`)
            .limit(5);

          if (!employeeError && fallbackEmployees && fallbackEmployees.length > 0) {
            // Try to match with employee names
            matchedEmployee = fallbackEmployees.find(employee => 
              employee.name?.trim().toLowerCase() === record.employeeName.toLowerCase()
            );
            
            if (matchedEmployee) {
              console.log(`Found match in employees table: ${matchedEmployee.name}`);
            }
          }
        }

        if (!matchedEmployee) {
          errors.push(`No employee found for Name: ${record.employeeName} (Employee ID from file: ${record.employeeId})`);
          fail++;
          continue;
        }

        // Convert times to ISO format
        const checkInTime = record.inTime ? 
          convertCustomTime(record.inTime, record.date) : null;
        const checkOutTime = record.outTime ? 
          convertCustomTime(record.outTime, record.date) : null;

        // Upsert attendance record
        const { error } = await supabase.from('attendance').upsert({
          employee_id: matchedEmployee.id,
          company_id: companyId,
          date: record.date,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          status: record.status,
          notes: `Imported from ${record.sourceFile} | Duration: ${record.duration}`,
          source_file: record.sourceFile,
          day_of_week: record.day
        }, {
          onConflict: 'employee_id,date'
        });

        if (error) {
          errors.push(`Import failed for ${record.employeeName} on ${record.date}: ${error.message}`);
          fail++;
        } else {
          success++;
        }
      }

      // Set statistics
      setImportStats({
        processed: json.length,
        imported: success,
        failed: fail,
        unmatched: errors.filter(e => e.includes('No employee found')).length,
        multiple: 0, // This format doesn't have multiple matches issue
        skipped: skip
      });

      toast({
        title: 'Import Complete',
        description: `${success} records imported, ${fail} failed, ${skip} skipped.`,
        variant: fail > 0 ? 'destructive' : 'default',
      });

      setImportErrors(errors);
      if (onImportComplete) onImportComplete();

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to import attendance.';
      console.error('Import error:', err);
      
      // Set persistent error
      setImportErrors([errorMessage]);
      
      // Show persistent toast
      toast({
        title: 'Import Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000 // Keep visible for 10 seconds
      });
    } finally {
      setImporting(false);
      // Don't auto-close dialog on error so user can see the errors
      if (importErrors.length === 0) {
        setOpen(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Custom Attendance Import</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Expected Format:</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              {showDebugInfo ? 'Hide' : 'Show'} Debug Info
            </Button>
          </div>

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
              <li>Employee ID (for reference only - not used for matching)</li>
              <li>Employee Name (used for matching with database)</li>
              <li>Date (DD-MMM-YY format, e.g., 28-Jan-26)</li>
              <li>Day</li>
              <li>Status (P, A, L, H, etc.)</li>
              <li>In Time (HH:MM:SS format)</li>
              <li>Out Time (HH:MM:SS format)</li>
              <li>Duration (HH:MM format)</li>
              <li>Source File</li>
            </ul>
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm">
                <strong>Important:</strong> Employee matching is done by <strong>Employee Name</strong> (not Employee ID). 
                The Employee ID column is for reference only.
              </p>
            </div>
          </div>

          {showDebugInfo && (
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
              <p><strong>Debug Information:</strong></p>
              <ul className="ml-4 list-disc">
                <li>Company ID: {companyId}</li>
                <li>Employees Found: {employees?.length || 0}</li>
                <li>Import Status: {importing ? 'Processing...' : 'Ready'}</li>
                <li>Errors Count: {importErrors.length}</li>
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">Status Mapping:</h3>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <ul className="ml-4 list-disc">
                <li><strong>P</strong> → Present</li>
                <li><strong>A</strong> → Absent</li>
                <li><strong>L</strong> → Late</li>
                <li><strong>H/HD</strong> → Half Day</li>
                <li><strong>HOLIDAY</strong> → Holiday</li>
                <li><strong>LEAVE</strong> → Absent</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="file"
              accept={fileType === 'csv' ? '.csv' : '.xlsx, .xls'}
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={importing}
              className="flex-1"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              variant="gradient"
            >
              {importing ? 'Processing...' : `Choose ${fileType === 'csv' ? 'CSV' : 'Excel'} File`}
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
              <li>Imported successfully: {importStats.imported}</li>
              <li>Failed: {importStats.failed}</li>
              <li>Skipped (no time data): {importStats.skipped}</li>
              <li>Unmatched employees: {importStats.unmatched}</li>
            </ul>
          </div>
        )}

        {importErrors.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-red-600">Errors ({importErrors.length})</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setImportErrors([])}
              >
                Clear Errors
              </Button>
            </div>
            <div className="text-red-600 text-sm max-h-60 overflow-y-auto bg-red-50 p-3 rounded border border-red-200">
              {importErrors.map((err, i) => (
                <div key={i} className="mb-2 pb-2 border-b border-red-200 last:border-b-0">
                  <div className="font-medium">Error {i + 1}:</div>
                  <div className="text-xs">{err}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Select File'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)} 
            disabled={importing}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomAttendanceImport;
