import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_PROFILE_EXPORT_KEYS,
  formatExportValue,
  getExportableFields,
  type ProfileExportField,
} from '@/utils/profileExportFields';

type ExportEmployee = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  department?: string | null;
  position?: string | null;
  hire_date?: string | null;
  is_active?: boolean | null;
  work_location?: string | null;
};

type AppliedFilters = {
  search: string;
  status: string;
  department: string;
  location: string;
  consultantId: string;
};

interface ProfileExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: ExportEmployee[];
  filters: AppliedFilters;
}

const csvCell = (value: string) => {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
};

const ProfileExportDialog: React.FC<ProfileExportDialogProps> = ({
  open,
  onOpenChange,
  employees,
  filters,
}) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const exportableFields = useMemo(() => getExportableFields(user?.role), [user?.role]);
  const [fieldQuery, setFieldQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>(DEFAULT_PROFILE_EXPORT_KEYS);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const allowed = new Set(exportableFields.map((field) => field.key));
    setSelectedKeys((current) => {
      const kept = current.filter((key) => allowed.has(key));
      return kept.length > 0 ? kept : DEFAULT_PROFILE_EXPORT_KEYS.filter((key) => allowed.has(key));
    });
    setFieldQuery('');
  }, [open, exportableFields]);

  const filteredFields = useMemo(() => {
    const q = fieldQuery.trim().toLowerCase();
    if (!q) return exportableFields;
    return exportableFields.filter(
      (field) =>
        field.label.toLowerCase().includes(q) ||
        field.group.toLowerCase().includes(q) ||
        field.column.toLowerCase().includes(q)
    );
  }, [exportableFields, fieldQuery]);

  const groupedFields = useMemo(() => {
    const groups = new Map<string, ProfileExportField[]>();
    for (const field of filteredFields) {
      const list = groups.get(field.group) || [];
      list.push(field);
      groups.set(field.group, list);
    }
    return groups;
  }, [filteredFields]);

  const selectedFields = selectedKeys
    .map((key) => exportableFields.find((field) => field.key === key))
    .filter((field): field is ProfileExportField => Boolean(field));

  const toggleField = (key: string, checked: boolean) => {
    setSelectedKeys((current) => {
      if (checked) return current.includes(key) ? current : [...current, key];
      return current.filter((item) => item !== key);
    });
  };

  const selectAllVisible = () => {
    const visible = filteredFields.map((field) => field.key);
    setSelectedKeys((current) => {
      const next = [...current];
      for (const key of visible) {
        if (!next.includes(key)) next.push(key);
      }
      return next;
    });
  };

  const clearAll = () => setSelectedKeys([]);

  const moveSelected = (index: number, direction: -1 | 1) => {
    const swap = index + direction;
    if (swap < 0 || swap >= selectedKeys.length) return;
    setSelectedKeys((current) => {
      const next = [...current];
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  };

  const resolveValue = (employee: ExportEmployee, profile: Record<string, any> | undefined, field: ProfileExportField) => {
    if (field.source === 'employee') {
      const raw = employee[field.column as keyof ExportEmployee];
      if (field.column === 'is_active') return raw ? 'Active' : 'Inactive';
      if (field.column === 'role') return String(raw || '').replace('_', ' ');
      return formatExportValue(raw);
    }
    return formatExportValue(profile?.[field.column]);
  };

  const handleExport = async () => {
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      toast({ title: 'Not authorized', description: 'Only admins can export profile data.', variant: 'destructive' });
      return;
    }
    if (selectedFields.length === 0) {
      toast({ title: 'Select at least one field', description: 'Choose fields to include in the export.', variant: 'destructive' });
      return;
    }
    if (employees.length === 0) {
      toast({ title: 'No records to export', description: 'No profiles match the current filters.', variant: 'destructive' });
      return;
    }

    setExporting(true);
    try {
      const profilesByEmployee = new Map<string, Record<string, any>>();
      const ids = employees.map((emp) => emp.id);
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { data, error } = await supabase
          .from('employee_profiles')
          .select('*')
          .in('employee_id', chunk);
        if (error) throw error;
        for (const row of data || []) {
          profilesByEmployee.set(row.employee_id, row as Record<string, any>);
        }
      }

      const headers = selectedFields.map((field) => field.label);
      const rows = employees.map((emp) =>
        selectedFields.map((field) => resolveValue(emp, profilesByEmployee.get(emp.id), field))
      );
      const stamp = format(new Date(), 'yyyy-MM-dd');
      const filename = `profiles_export_${stamp}.${exportFormat === 'xlsx' ? 'xlsx' : 'csv'}`;

      if (exportFormat === 'xlsx') {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Profiles');
        XLSX.writeFile(wb, filename);
      } else {
        const csv = [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      const { error: auditError } = await supabase.from('profile_export_audit').insert({
        user_id: user.id,
        user_role: user.role,
        company_id: currentCompany?.id || null,
        selected_fields: selectedFields.map((field) => field.key),
        applied_filters: filters,
        record_count: employees.length,
        export_format: exportFormat,
      });
      if (auditError) {
        console.error('Export audit log failed:', auditError);
      }

      toast({
        title: 'Export complete',
        description: `Downloaded ${filename} with ${employees.length} record${employees.length === 1 ? '' : 's'}.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      console.error('Profile export failed:', err);
      toast({
        title: 'Export failed',
        description: err?.message || 'Could not generate the export file.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Export Profiles</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {employees.length} matching record{employees.length === 1 ? '' : 's'} will be exported (all pages, current filters).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
          <div className="space-y-3">
            <Input
              placeholder="Search fields"
              value={fieldQuery}
              onChange={(e) => setFieldQuery(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                Select all
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            </div>
            <ScrollArea className="h-[380px] rounded-md border p-3">
              {Array.from(groupedFields.entries()).map(([group, fields]) => (
                <div key={group} className="mb-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{group}</p>
                  <div className="space-y-2">
                    {fields.map((field) => (
                      <label key={field.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selectedKeys.includes(field.key)}
                          onCheckedChange={(checked) => toggleField(field.key, checked === true)}
                        />
                        <span>
                          {field.label}
                          {field.superAdminOnly ? (
                            <span className="ml-1 text-xs text-muted-foreground">(Super Admin)</span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {filteredFields.length === 0 && (
                <p className="text-sm text-muted-foreground">No fields match that search.</p>
              )}
            </ScrollArea>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Field order ({selectedFields.length} selected)</p>
            <ScrollArea className="h-[280px] rounded-md border p-2">
              {selectedFields.length === 0 && (
                <p className="text-sm text-muted-foreground p-2">Select fields to set column order.</p>
              )}
              {selectedFields.map((field, index) => (
                <div key={field.key} className="flex items-center justify-between gap-2 py-1 px-1">
                  <span className="text-sm truncate">{index + 1}. {field.label}</span>
                  <div className="flex shrink-0">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSelected(index, -1)} disabled={index === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSelected(index, 1)} disabled={index === selectedFields.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
            <div className="space-y-2">
              <Label>Export format</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="profile-export-format"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                  />
                  CSV
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="profile-export-format"
                    checked={exportFormat === 'xlsx'}
                    onChange={() => setExportFormat('xlsx')}
                  />
                  Excel
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={exporting || selectedFields.length === 0}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileExportDialog;
