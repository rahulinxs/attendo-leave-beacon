import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Cake, CalendarDays, Heart, Loader2, RefreshCw, Search, Save, BriefcaseBusiness, Check, ChevronsUpDown, X, List, Table2, ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
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
type AnniversaryView = 'existing' | 'calendar' | 'table' | 'events';
type EventType = 'work' | 'birthday' | 'marriage';

interface AnniversaryEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  type: EventType;
  label: string;
  sourceDate: string;
  date: Date;
}

const DATASET_LIMIT = 500;
const EVENT_LABELS: Record<EventType, string> = {
  work: 'Work Anniversary',
  birthday: 'Birthday',
  marriage: 'Marriage Anniversary',
};
const EVENT_STYLES: Record<EventType, string> = {
  work: 'border-blue-200 bg-blue-50 text-blue-800',
  birthday: 'border-pink-200 bg-pink-50 text-pink-800',
  marriage: 'border-rose-200 bg-rose-50 text-rose-800',
};

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
  const [filterOptions, setFilterOptions] = useState<Pick<EmployeeRow, 'id' | 'name' | 'email' | 'role' | 'department'>[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<EditableDateField, string>>>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [consultantId, setConsultantId] = useState('all');
  const [consultantOpen, setConsultantOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalEmployeeCount, setTotalEmployeeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AnniversaryView>('existing');
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [tableSort, setTableSort] = useState<EditableDateField>('hire_date');
  const [tableSortAscending, setTableSortAscending] = useState(true);
  const [eventPage, setEventPage] = useState(1);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => setAppliedSearchTerm(searchTerm), 300);
    return () => window.clearTimeout(debounceTimer);
  }, [searchTerm]);

  const fetchEmployees = useCallback(async () => {
    if (!currentCompany?.id || !isAdminRole(user?.role)) return;

    setIsLoading(true);
    setError(null);
    try {
      // Fetch only the visible employee page; profile dates are loaded only for those IDs below.
      let employeeQuery = supabase
        .from('employees')
        .select('id, name, email, role, department, work_location, is_active, hire_date', { count: 'exact' })
        .eq('company_id', currentCompany.id)
        .order('name');

      if (appliedSearchTerm.trim()) {
        const search = appliedSearchTerm.trim();
        employeeQuery = employeeQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,department.ilike.%${search}%,role.ilike.%${search}%`);
      }
      if (roleFilter !== 'all') employeeQuery = employeeQuery.eq('role', roleFilter);
      if (departmentFilter !== 'all') employeeQuery = employeeQuery.eq('department', departmentFilter);
      if (locationFilter === UNASSIGNED_LOCATION) {
        employeeQuery = employeeQuery.is('work_location', null);
      } else if (locationFilter !== 'all') {
        employeeQuery = employeeQuery.eq('work_location', locationFilter);
      }
      if (statusFilter === 'active') employeeQuery = employeeQuery.eq('is_active', true);
      if (statusFilter === 'inactive') employeeQuery = employeeQuery.eq('is_active', false);
      if (consultantId !== 'all') employeeQuery = employeeQuery.eq('id', consultantId);

      const { data: employeeData, count, error: employeeError } = await employeeQuery
        .range(0, DATASET_LIMIT - 1);

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
      // Keep local view pagination aligned with the bounded dataset returned above.
      setTotalEmployeeCount(Math.min(count || 0, DATASET_LIMIT));
    } catch (fetchError) {
      console.error('Error loading employee anniversaries:', fetchError);
      setError('Unable to load employee anniversary details.');
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearchTerm, consultantId, currentCompany?.id, departmentFilter, locationFilter, page, pageSize, roleFilter, statusFilter, user?.role]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (!currentCompany?.id || !isAdminRole(user?.role)) {
      setFilterOptions([]);
      return;
    }

    const loadFilterOptions = async () => {
      const { data, error: optionsError } = await supabase
        .from('employees')
        .select('id, name, email, role, department')
        .eq('company_id', currentCompany.id)
        .order('name')
        .limit(500);

      if (optionsError) {
        console.error('Error loading anniversary filter options:', optionsError);
        return;
      }

      // Cache the bounded, label-only list so filter changes do not repeat this read.
      setFilterOptions(data || []);
    };

    loadFilterOptions();
  }, [currentCompany?.id, user?.role]);

  const filteredEmployees = useMemo(() => {
    return employees;
  }, [employees]);

  const departments = useMemo(() =>
    Array.from(new Set(filterOptions.map(employee => employee.department).filter(Boolean))).sort(),
  [filterOptions]);
  const roles = useMemo(() =>
    Array.from(new Set(filterOptions.map(employee => employee.role))).sort(),
  [filterOptions]);
  const locationOptions = useMemo(() => [...activeNames].sort((a, b) => a.localeCompare(b)), [activeNames]);
  const selectedConsultant = useMemo(
    () => filterOptions.find(employee => employee.id === consultantId) || null,
    [filterOptions, consultantId]
  );
  const totalPages = Math.max(1, Math.ceil(totalEmployeeCount / pageSize));
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  const anniversaryEvents = useMemo(() => {
    const events: AnniversaryEvent[] = [];
    const years = [calendarDate.getFullYear() - 1, calendarDate.getFullYear(), calendarDate.getFullYear() + 1];
    employees.forEach(employee => {
      const sourceDates: Array<[EventType, string | null]> = [
        ['work', employee.hire_date],
        ['birthday', employee.date_of_birth],
        ['marriage', employee.marriage_anniversary],
      ];
      sourceDates.forEach(([type, sourceDate]) => {
        if (!sourceDate) return;
        const [, month, day] = sourceDate.split('-').map(Number);
        if (!month || !day) return;
        years.forEach(year => {
          const safeDay = month === 2 && day === 29 && !((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 28 : day;
          const date = new Date(year, month - 1, safeDay);
          events.push({ id: `${employee.id}-${type}-${year}`, employeeId: employee.id, employeeName: employee.name, type, label: EVENT_LABELS[type], sourceDate, date });
        });
      });
    });
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [calendarDate, employees]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return anniversaryEvents.filter(event => event.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [anniversaryEvents]);

  const sortedTableEmployees = useMemo(() => [...employees].sort((a, b) => {
    const aValue = a[tableSort] || '';
    const bValue = b[tableSort] || '';
    return tableSortAscending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
  }), [employees, tableSort, tableSortAscending]);

  const eventPageSize = 20;
  const eventTotalPages = Math.max(1, Math.ceil(upcomingEvents.length / eventPageSize));
  const paginatedEvents = upcomingEvents.slice((eventPage - 1) * eventPageSize, eventPage * eventPageSize);

  useEffect(() => {
    setPage(1);
  }, [appliedSearchTerm, roleFilter, departmentFilter, locationFilter, statusFilter, consultantId, pageSize]);

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
                      {selectedConsultant ? `${selectedConsultant.name} (${selectedConsultant.email})` : 'All Employees'}
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
                            All Employees
                          </CommandItem>
                          {filterOptions.map(employee => (
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
                <span className="text-sm text-blue-800">{totalEmployeeCount} employees match filters</span>
                <Button variant="gradient" size="sm" onClick={clearFilters}><X className="mr-2 h-4 w-4" />Clear Filters</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium">View:</span>
        {([
          ['existing', 'Anniversary Cards', CalendarDays],
          ['calendar', 'Anniversary Calendar', CalendarRange],
          ['table', 'Anniversary Table', Table2],
          ['events', 'Upcoming Events', List],
        ] as const).map(([key, label, Icon]) => (
          <Button key={key} size="sm" variant={view === key ? 'default' : 'outline'} onClick={() => { setView(key); setEventPage(1); }}>
            <Icon className="mr-2 h-4 w-4" />{label}
          </Button>
        ))}
      </div>

      {error && <Card><CardContent className="p-6 text-center text-destructive">{error}</CardContent></Card>}

      {!isLoading && !error && filteredEmployees.length === 0 && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No employees found.</CardContent></Card>
      )}

      {view === 'existing' && <>
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
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages} - Showing {paginatedEmployees.length} of {totalEmployeeCount} employees</div>
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
      </>}

      {view === 'table' && <AnniversaryTable employees={employees} onSort={(field) => { if (tableSort === field) setTableSortAscending(current => !current); else { setTableSort(field); setTableSortAscending(true); } }} sortField={tableSort} ascending={tableSortAscending} />}
      {view === 'events' && <AnniversaryEventList events={upcomingEvents} page={eventPage} pageSize={eventPageSize} totalPages={eventTotalPages} onPageChange={setEventPage} />}
      {view === 'calendar' && <AnniversaryCalendar date={calendarDate} mode={calendarMode} events={anniversaryEvents} onDateChange={setCalendarDate} onModeChange={setCalendarMode} />}
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

interface AnniversaryTableProps {
  employees: EmployeeRow[];
  sortField: EditableDateField;
  ascending: boolean;
  onSort: (field: EditableDateField) => void;
}

const AnniversaryTable: React.FC<AnniversaryTableProps> = ({ employees, sortField, ascending, onSort }) => {
  const sorted = [...employees].sort((a, b) => {
    const result = (a[sortField] || '').localeCompare(b[sortField] || '');
    return ascending ? result : -result;
  });
  const heading = (field: EditableDateField, label: string) => (
    <button className="font-medium" onClick={() => onSort(field)}>{label} {sortField === field ? (ascending ? '↑' : '↓') : ''}</button>
  );
  return (
    <Card>
      <CardHeader><CardTitle>Anniversary Table</CardTitle></CardHeader>
      <CardContent>
        <div className="max-w-full overflow-x-auto rounded-md border">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-muted/40"><tr><th className="p-3 text-left">Employee Name</th><th className="p-3 text-left">{heading('hire_date', 'Work Anniversary')}</th><th className="p-3 text-left">{heading('date_of_birth', 'Birthday')}</th><th className="p-3 text-left">{heading('marriage_anniversary', 'Marriage Anniversary')}</th></tr></thead>
            <tbody>{sorted.map(employee => <tr key={employee.id} className="border-t"><td className="p-3 font-medium">{employee.name}<span className="block text-xs text-muted-foreground">{employee.email}</span></td><td className="p-3">{formatDate(employee.hire_date)}</td><td className="p-3">{formatDate(employee.date_of_birth)}</td><td className="p-3">{formatDate(employee.marriage_anniversary)}</td></tr>)}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

interface AnniversaryEventListProps {
  events: AnniversaryEvent[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const AnniversaryEventList: React.FC<AnniversaryEventListProps> = ({ events, page, pageSize, totalPages, onPageChange }) => {
  const visibleEvents = events.slice((page - 1) * pageSize, page * pageSize);
  return (
    <Card><CardHeader><CardTitle>Upcoming Anniversary Events</CardTitle><p className="text-sm text-muted-foreground">Upcoming events first, calculated using the current year and date-only values.</p></CardHeader><CardContent className="space-y-3">
      {visibleEvents.map(event => <button type="button" key={event.id} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-left hover:bg-muted/40"><div><p className="font-medium">{event.employeeName}</p><p className="text-sm text-muted-foreground">{event.label} · {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div><span className={`rounded-full border px-2 py-1 text-xs font-medium ${EVENT_STYLES[event.type]}`}>{event.label}</span></button>)}
      {visibleEvents.length === 0 && <p className="py-8 text-center text-muted-foreground">No upcoming events found.</p>}
      {events.length > 0 && <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button></div></div>}
    </CardContent></Card>
  );
};

interface AnniversaryCalendarProps {
  date: Date;
  mode: 'month' | 'week';
  events: AnniversaryEvent[];
  onDateChange: (date: Date) => void;
  onModeChange: (mode: 'month' | 'week') => void;
}

const AnniversaryCalendar: React.FC<AnniversaryCalendarProps> = ({ date, mode, events, onDateChange, onModeChange }) => {
  const [selectedEvent, setSelectedEvent] = useState<AnniversaryEvent | null>(null);
  const start = mode === 'month'
    ? new Date(date.getFullYear(), date.getMonth(), 1)
    : new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  const dayCount = mode === 'month' ? new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() : 7;
  const leading = mode === 'month' ? start.getDay() : 0;
  const cells = Array.from({ length: leading + dayCount }, (_, index) => {
    if (index < leading) return null;
    const value = new Date(start);
    value.setDate(start.getDate() + index - leading);
    return value;
  });
  const eventForDay = (day: Date) => events.filter(event => event.date.getFullYear() === day.getFullYear() && event.date.getMonth() === day.getMonth() && event.date.getDate() === day.getDate());
  const shift = (amount: number) => {
    const next = new Date(date);
    if (mode === 'month') next.setMonth(next.getMonth() + amount); else next.setDate(next.getDate() + amount * 7);
    onDateChange(next);
  };
  return (
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Anniversary Calendar</CardTitle><p className="text-sm text-muted-foreground">Select an event to view its employee and event details.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => onDateChange(new Date())}>Today</Button><Button size="sm" variant="outline" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button><Select value={mode} onValueChange={value => onModeChange(value as 'month' | 'week')}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">Monthly</SelectItem><SelectItem value="week">Weekly</SelectItem></SelectContent></Select></div></div></CardHeader><CardContent><div className="mb-3 text-center text-lg font-semibold">{date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div><div className="grid grid-cols-7 border-l border-t text-xs"><div className="col-span-7 grid grid-cols-7">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="border-b border-r bg-muted/40 p-2 text-center font-medium">{day}</div>)}</div>{cells.map((day, index) => <div key={`${day?.toISOString() || 'empty'}-${index}`} className="min-h-24 min-w-0 border-b border-r p-1">{day && <><div className="mb-1 font-medium">{day.getDate()}</div><div className="space-y-1">{eventForDay(day).map(event => <button type="button" key={event.id} onClick={() => setSelectedEvent(event)} className={`block w-full truncate rounded border px-1 py-1 text-left text-[11px] ${EVENT_STYLES[event.type]}`} title={`${event.employeeName} - ${event.label}`}>{event.employeeName} · {event.label}</button>)}</div></>}</div>)}</div>{selectedEvent && <div className="mt-4 rounded-md border p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{selectedEvent.employeeName}</p><p className="text-sm text-muted-foreground">{selectedEvent.label} · {selectedEvent.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div><Button size="sm" variant="ghost" onClick={() => setSelectedEvent(null)}>Close</Button></div></div>}</CardContent></Card>
  );
};

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
