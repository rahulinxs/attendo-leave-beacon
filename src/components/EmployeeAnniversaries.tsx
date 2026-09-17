import React, { useEffect, useMemo, useState } from 'react';
import { Cake, CalendarDays, Heart, Loader2, RefreshCw, Search, Save, BriefcaseBusiness, Check, ChevronsUpDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { UNASSIGNED_LOCATION } from '@/utils/companyLocations';
import { useCompanyLocations } from '@/hooks/useCompanyLocations';
import { useToast } from '@/hooks/use-toast';

interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  work_location: string | null;
  is_active: boolean;
  hire_date: string | null;
  date_of_birth: string | null;
  marriage_anniversary: string | null;
}

type EditableDateField = 'hire_date' | 'date_of_birth' | 'marriage_anniversary';

const isAdminRole = (role?: string) => role === 'admin' || role === 'super_admin';

const formatDate = (value: string | null) => {
  if (!value) return 'Not set';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const EmployeeAnniversaries: React.FC = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { activeNames } = useCompanyLocations();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<EditableDateField, string>>>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [consultantId, setConsultantId] = useState('all');
  const [consultantOpen, setConsultantOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    if (!currentCompany?.id || !isAdminRole(user?.role)) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, name, email, role, department, work_location, is_active, hire_date')
        .eq('company_id', currentCompany.id)
        .order('name');

      if (employeeError) throw employeeError;

      const employeeIds = (employeeData || []).map(employee => employee.id);
      const { data: profileData, error: profileError } = employeeIds.length
        ? await supabase
            .from('employee_profiles')
            .select('employee_id, date_of_birth, marriage_anniversary')
            .in('employee_id', employeeIds)
        : { data: [], error: null };

      if (profileError) throw profileError;

      const profilesByEmployee = new Map(
        (profileData || []).map(profile => [profile.employee_id, profile])
      );

      setEmployees((employeeData || []).map(employee => {
        const profile = profilesByEmployee.get(employee.id);
        return {
          ...employee,
          date_of_birth: profile?.date_of_birth || null,
          marriage_anniversary: profile?.marriage_anniversary || null,
        };
      }));
    } catch (fetchError) {
      console.error('Error loading employee anniversaries:', fetchError);
      setError('Unable to load employee anniversary details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentCompany?.id, user?.role]);

  const filteredEmployees = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return employees.filter(employee =>
      (!search || [employee.name, employee.email, employee.department || '', employee.role]
        .some(value => value.toLowerCase().includes(search))) &&
      (roleFilter === 'all' || employee.role === roleFilter) &&
      (departmentFilter === 'all' || employee.department === departmentFilter) &&
      (locationFilter === 'all' ||
        (locationFilter === UNASSIGNED_LOCATION ? !employee.work_location : employee.work_location === locationFilter)) &&
      (statusFilter === 'all' ||
        (statusFilter === 'active' ? employee.is_active : !employee.is_active)) &&
      (consultantId === 'all' || employee.id === consultantId)
    );
  }, [employees, searchTerm, roleFilter, departmentFilter, locationFilter, statusFilter, consultantId]);

  const departments = useMemo(() =>
    Array.from(new Set(employees.map(employee => employee.department).filter(Boolean))).sort(),
  [employees]);
  const roles = useMemo(() =>
    Array.from(new Set(employees.map(employee => employee.role))).sort(),
  [employees]);
  const locationOptions = useMemo(() => [...activeNames].sort((a, b) => a.localeCompare(b)), [activeNames]);
  const selectedConsultant = useMemo(
    () => employees.find(employee => employee.id === consultantId) || null,
    [employees, consultantId]
  );
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, departmentFilter, locationFilter, statusFilter, consultantId, pageSize]);

  const getValue = (employee: EmployeeRow, field: EditableDateField) =>
    drafts[employee.id]?.[field] ?? employee[field] ?? '';

  const updateDraft = (employeeId: string, field: EditableDateField, value: string) => {
    setDrafts(current => ({
      ...current,
      [employeeId]: { ...current[employeeId], [field]: value },
    }));
  };

  const saveEmployee = async (employee: EmployeeRow) => {
    const draft = drafts[employee.id];
    if (!draft || Object.keys(draft).length === 0) return;

    setSavingId(employee.id);
    try {
      const employeeUpdate: { hire_date?: string | null } = {};
      if (draft.hire_date !== undefined) employeeUpdate.hire_date = draft.hire_date || null;

      if (Object.keys(employeeUpdate).length > 0) {
        const { error: employeeError } = await supabase
          .from('employees')
          .update(employeeUpdate)
          .eq('id', employee.id)
          .eq('company_id', currentCompany?.id || '');
        if (employeeError) throw employeeError;
      }

      const profileUpdate = {
        employee_id: employee.id,
        date_of_birth: draft.date_of_birth !== undefined
          ? draft.date_of_birth || null
          : employee.date_of_birth,
        marriage_anniversary: draft.marriage_anniversary !== undefined
          ? draft.marriage_anniversary || null
          : employee.marriage_anniversary,
      };

      const { error: profileError } = await supabase
        .from('employee_profiles')
        .upsert(profileUpdate, { onConflict: 'employee_id' });
      if (profileError) throw profileError;

      setEmployees(current => current.map(item => item.id === employee.id
        ? {
            ...item,
            hire_date: draft.hire_date !== undefined ? draft.hire_date || null : item.hire_date,
            date_of_birth: draft.date_of_birth !== undefined ? draft.date_of_birth || null : item.date_of_birth,
            marriage_anniversary: draft.marriage_anniversary !== undefined
              ? draft.marriage_anniversary || null
              : item.marriage_anniversary,
          }
        : item
      ));
      setDrafts(current => {
        const next = { ...current };
        delete next[employee.id];
        return next;
      });
      toast({ title: 'Saved', description: `${employee.name}'s anniversary details were updated.` });
    } catch (saveError) {
      console.error('Error saving employee anniversaries:', saveError);
      toast({ title: 'Save failed', description: 'The anniversary details could not be saved.', variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setDepartmentFilter('all');
    setLocationFilter('all');
    setStatusFilter('all');
    setConsultantId('all');
  };

  if (!user || !isAdminRole(user.role)) {
    return <div className="p-8 text-center text-red-500">Access Denied: This section is only available to administrators.</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarDays className="h-6 w-6 text-blue-600" />
                Employee Anniversaries
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                View and maintain birthdays, marriage anniversaries, and work anniversaries.
              </p>
            </div>
            <Button onClick={fetchEmployees} disabled={isLoading} variant="outline">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search employees" className="pl-9" />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <label className="text-sm font-medium">Employee</label>
                <Popover open={consultantOpen} onOpenChange={setConsultantOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={consultantOpen} className="w-full justify-between">
                      {selectedConsultant ? `${selectedConsultant.name} (${selectedConsultant.email})` : 'All Consultants'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search consultant..." />
                      <CommandList>
                        <CommandEmpty>No consultant found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="all" onSelect={() => { setConsultantId('all'); setConsultantOpen(false); }}>
                            <Check className={cn('mr-2 h-4 w-4', consultantId === 'all' ? 'opacity-100' : 'opacity-0')} />
                            All Consultants
                          </CommandItem>
                          {employees.map(employee => (
                            <CommandItem key={employee.id} value={`${employee.name} ${employee.email}`} onSelect={() => { setConsultantId(employee.id); setConsultantOpen(false); }}>
                              <Check className={cn('mr-2 h-4 w-4', consultantId === employee.id ? 'opacity-100' : 'opacity-0')} />
                              {employee.name} ({employee.email})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} allLabel="All Roles" options={roles} formatOption={value => value.replace('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())} />
              <FilterSelect label="Department" value={departmentFilter} onChange={setDepartmentFilter} allLabel="All Departments" options={departments as string[]} />
              <FilterSelect label="Location" value={locationFilter} onChange={setLocationFilter} allLabel="All Locations" options={[UNASSIGNED_LOCATION, ...locationOptions]} formatOption={value => value === UNASSIGNED_LOCATION ? 'No location' : value} />
              <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} allLabel="All Statuses" options={['active', 'inactive']} formatOption={value => value.charAt(0).toUpperCase() + value.slice(1)} />
            </div>
            {(searchTerm || roleFilter !== 'all' || departmentFilter !== 'all' || locationFilter !== 'all' || statusFilter !== 'all' || consultantId !== 'all') && (
              <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
                <span className="text-sm text-blue-800">{filteredEmployees.length} employees match filters</span>
                <Button variant="gradient" size="sm" onClick={clearFilters}><X className="mr-2 h-4 w-4" />Clear Filters</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && <Card><CardContent className="p-6 text-center text-destructive">{error}</CardContent></Card>}

      {!isLoading && !error && filteredEmployees.length === 0 && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No employees found.</CardContent></Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {paginatedEmployees.map(employee => (
          <Card key={employee.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{employee.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{employee.email}</p>
                  <p className="text-xs text-muted-foreground">{employee.department || 'Department not assigned'}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => saveEmployee(employee)}
                  disabled={savingId === employee.id || !drafts[employee.id]}
                >
                  {savingId === employee.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <DateField
                icon={<BriefcaseBusiness className="h-4 w-4 text-blue-600" />}
                label="Work Anniversary"
                value={getValue(employee, 'hire_date')}
                displayValue={formatDate(employee.hire_date)}
                onChange={value => updateDraft(employee.id, 'hire_date', value)}
              />
              <DateField
                icon={<Cake className="h-4 w-4 text-pink-600" />}
                label="Birthday"
                value={getValue(employee, 'date_of_birth')}
                displayValue={formatDate(employee.date_of_birth)}
                onChange={value => updateDraft(employee.id, 'date_of_birth', value)}
              />
              <DateField
                icon={<Heart className="h-4 w-4 text-rose-600" />}
                label="Marriage Anniversary"
                value={getValue(employee, 'marriage_anniversary')}
                displayValue={formatDate(employee.marriage_anniversary)}
                onChange={value => updateDraft(employee.id, 'marriage_anniversary', value)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages} - Showing {paginatedEmployees.length} of {filteredEmployees.length} employees</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={pageSize.toString()} onValueChange={value => setPageSize(Number(value))}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>{['6', '12', '24', '48', '96'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
};

interface DateFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  displayValue: string;
  onChange: (value: string) => void;
}

const DateField: React.FC<DateFieldProps> = ({ icon, label, value, displayValue, onChange }) => (
  <label className="space-y-2">
    <span className="flex items-center gap-2 text-sm font-medium">{icon}{label}</span>
    <Input type="date" value={value} onChange={event => onChange(event.target.value)} aria-label={label} />
    <span className="block text-xs text-muted-foreground">Current: {displayValue}</span>
  </label>
);

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: string[];
  formatOption?: (value: string) => string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, onChange, allLabel, options, formatOption = option => option }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium">{label}</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={allLabel} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map(option => <SelectItem key={option} value={option}>{formatOption(option)}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

export default EmployeeAnniversaries;
