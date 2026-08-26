import React, { useEffect, useMemo, useState } from 'react';
import { eachDayOfInterval, endOfMonth, format, isWeekend, startOfMonth, subDays } from 'date-fns';
import { AlertTriangle, Calendar, CheckCircle, ClipboardCheck, Home, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useLeave } from '@/hooks/useLeave';
import { toast } from '@/hooks/use-toast';
import { parseDateLocal } from '@/utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const REGULARIZATION_NOTE = '[Regularization]';
const PRESENT_STATUSES = new Set(['present', 'late', 'work_from_home', 'half_day']);

type GapRow = {
  date: string;
  weekday: string;
  attendanceMarked: boolean;
  leaveMarked: boolean;
  pendingRegularization: boolean;
  attendanceLabel: string;
  leaveLabel: string;
  needsAction: boolean;
};

const toDateKey = (d: Date) => format(d, 'yyyy-MM-dd');

const AttendanceRegularization: React.FC = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { submitLeaveRequest } = useLeave('employee');
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<GapRow[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<{ id: string; name: string }[]>([]);
  const [actionDate, setActionDate] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<'attendance' | 'leave' | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'work_from_home' | 'half_day'>('present');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const yearOptions = useMemo(() => {
    const y = today.getFullYear();
    return [y, y - 1, y - 2];
  }, [today]);

  const loadGaps = async () => {
    if (!user || !currentCompany) return;
    setLoading(true);
    try {
      const monthStart = startOfMonth(new Date(year, month - 1, 1));
      const monthEnd = endOfMonth(monthStart);
      const cutoff = subDays(today, 1);
      const rangeEnd = cutoff < monthStart ? monthStart : cutoff < monthEnd ? cutoff : monthEnd;
      const startKey = toDateKey(monthStart);
      const endKey = toDateKey(rangeEnd);

      const [{ data: employee }, { data: holidays }, { data: attendance }, { data: leaves }, { data: types }] = await Promise.all([
        supabase.from('employees').select('hire_date').eq('id', user.id).maybeSingle(),
        supabase.from('holidays').select('date').gte('date', startKey).lte('date', toDateKey(monthEnd)),
        supabase.from('attendance').select('date, status, check_in_time, pending_approval, notes').eq('employee_id', user.id).eq('company_id', currentCompany.id).gte('date', startKey).lte('date', endKey),
        supabase.from('leave_requests').select('start_date, end_date, status, leave_types(name)').eq('employee_id', user.id).eq('company_id', currentCompany.id).neq('status', 'rejected').lte('start_date', endKey).gte('end_date', startKey),
        supabase.from('leave_types').select('id, name').eq('company_id', currentCompany.id).eq('is_active', true).order('name'),
      ]);

      setLeaveTypes(types || []);
      const holidaySet = new Set((holidays || []).map((h) => h.date));
      const attendanceMap = new Map((attendance || []).map((row) => [row.date, row]));
      const hireDate = employee?.hire_date || startKey;
      const startFrom = hireDate > startKey ? hireDate : startKey;
      if (startFrom > endKey) {
        setRows([]);
        return;
      }

      const days = eachDayOfInterval({
        start: parseDateLocal(startFrom),
        end: parseDateLocal(endKey),
      });

      const nextRows: GapRow[] = [];
      for (const day of days) {
        if (isWeekend(day)) continue;
        const date = toDateKey(day);
        if (holidaySet.has(date)) continue;

        const att = attendanceMap.get(date);
        const coveringLeave = (leaves || []).find((leave) => leave.start_date <= date && leave.end_date >= date);
        const leaveTypeRel = coveringLeave?.leave_types as { name?: string } | { name?: string }[] | null | undefined;
        const leaveTypeName = Array.isArray(leaveTypeRel) ? leaveTypeRel[0]?.name : leaveTypeRel?.name;
        const pendingRegularization = Boolean(att?.pending_approval);
        const attendanceMarked = Boolean(
          att && !pendingRegularization && (PRESENT_STATUSES.has(att.status || '') || att.check_in_time || att.status === 'holiday')
        );
        const leaveMarked = Boolean(coveringLeave);
        const absentWithoutLeave = att?.status === 'absent' && !leaveMarked;
        const needsAction = (!attendanceMarked && !leaveMarked) || absentWithoutLeave;

        nextRows.push({
          date,
          weekday: format(day, 'EEE'),
          attendanceMarked,
          leaveMarked,
          pendingRegularization,
          attendanceLabel: pendingRegularization
            ? 'Pending regularization'
            : attendanceMarked
              ? (att?.status || 'Marked').replace('_', ' ')
              : att?.status === 'absent'
                ? 'Absent (no leave)'
                : 'Not marked',
          leaveLabel: coveringLeave
            ? `${coveringLeave.status}${leaveTypeName ? ` · ${leaveTypeName}` : ''}`
            : 'Not marked',
          needsAction: needsAction && !pendingRegularization,
        });
      }
      // Only gap days: missing attendance (with or without leave), absent without leave, or pending approval
      setRows(nextRows.filter((row) => row.needsAction || row.pendingRegularization || !row.attendanceMarked));
    } catch (error) {
      console.error(error);
      toast({ title: 'Unable to load gaps', description: 'Could not compare attendance and leave.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGaps();
  }, [user, currentCompany, year, month]);

  const unmarkedAttendance = rows.filter((row) => !row.attendanceMarked).length;
  const unmarkedLeave = rows.filter((row) => !row.leaveMarked && !row.attendanceMarked).length;
  const needsRegularization = rows.filter((row) => row.needsAction).length;

  const openAction = (date: string, mode: 'attendance' | 'leave') => {
    setActionDate(date);
    setActionMode(mode);
    setReason('');
    setAttendanceStatus('present');
    setLeaveTypeId(leaveTypes[0]?.id || '');
  };

  const handleSubmit = async () => {
    if (!user || !currentCompany || !actionDate || !actionMode) return;
    if (!reason.trim()) {
      toast({ title: 'Reason required', description: 'Please explain this regularization.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (actionMode === 'attendance') {
        const isSuperAdmin = user.role === 'super_admin';
        const { error } = await supabase.from('attendance').upsert({
          employee_id: user.id,
          company_id: currentCompany.id,
          date: actionDate,
          status: attendanceStatus,
          notes: `${REGULARIZATION_NOTE} ${reason.trim()}`,
          pending_approval: !isSuperAdmin,
          requestor_role: user.role,
        }, { onConflict: 'employee_id,date' });
        if (error) throw error;
        if (isSuperAdmin) {
          await supabase
            .from('attendance')
            .update({ pending_approval: false })
            .eq('employee_id', user.id)
            .eq('date', actionDate)
            .eq('company_id', currentCompany.id);
        }
        toast({
          title: isSuperAdmin ? 'Attendance regularized' : 'Attendance regularization submitted',
          description: isSuperAdmin ? 'Auto-approved, same as leave requests for super admin.' : 'Sent for approval.',
        });
      } else {
        if (!leaveTypeId) {
          toast({ title: 'Leave type required', variant: 'destructive' });
          setSaving(false);
          return;
        }
        const ok = await submitLeaveRequest(
          leaveTypeId,
          actionDate,
          actionDate,
          `${REGULARIZATION_NOTE} ${reason.trim()}`
        );
        if (!ok) {
          toast({ title: 'Leave request failed', description: 'This day may already have leave.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        toast({
          title: user.role === 'super_admin' ? 'Leave request auto-approved' : 'Leave request submitted',
          description: user.role === 'super_admin'
            ? 'Regularization leave is approved immediately for super admin.'
            : 'Use this to cover the unmarked day.',
        });
      }
      setActionDate(null);
      setActionMode(null);
      await loadGaps();
    } catch (error: any) {
      toast({ title: 'Request failed', description: error?.message || 'Could not submit regularization.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          Attendance Regularization
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Working days where attendance is not marked and leave is not applied are highlighted so you can regularize them.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
        <div>
          <Label>Year</Label>
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Month</Label>
          <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {format(new Date(2000, i, 1), 'MMMM')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Attendance not marked</p>
            <p className="text-2xl font-bold text-amber-600">{unmarkedAttendance}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-orange-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Leave not marked</p>
            <p className="text-2xl font-bold text-orange-600">{unmarkedLeave}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Needs regularization</p>
            <p className="text-2xl font-bold text-red-600">{needsRegularization}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unmarked working days</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading gaps...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
              No unmarked attendance or leave gaps for this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Attendance</th>
                    <th className="text-left p-3">Leave</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.date} className={`border-b ${row.needsAction ? 'bg-red-50' : row.pendingRegularization ? 'bg-amber-50' : ''}`}>
                      <td className="p-3 font-medium">
                        {format(parseDateLocal(row.date), 'dd MMM yyyy')}
                        <span className="text-muted-foreground ml-2">{row.weekday}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant={row.attendanceMarked ? 'default' : 'secondary'} className={!row.attendanceMarked ? 'bg-amber-100 text-amber-800' : ''}>
                          {row.attendanceLabel}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={row.leaveMarked ? 'default' : 'secondary'} className={!row.leaveMarked ? 'bg-orange-100 text-orange-800' : ''}>
                          {row.leaveLabel}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {row.pendingRegularization ? (
                          <span className="text-xs text-amber-700">Waiting for approval</span>
                        ) : row.needsAction ? (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => openAction(row.date, 'attendance')}>
                              <Home className="w-4 h-4 mr-1" /> Regularize attendance
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openAction(row.date, 'leave')}>
                              <Calendar className="w-4 h-4 mr-1" /> Apply leave
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No action needed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(actionDate && actionMode)} onOpenChange={(open) => { if (!open) { setActionDate(null); setActionMode(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionMode === 'leave' ? 'Apply leave' : 'Regularize attendance'}
              {actionDate ? ` · ${format(parseDateLocal(actionDate), 'dd MMM yyyy')}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {actionMode === 'attendance' && (
              <div>
                <Label>Mark as</Label>
                <Select value={attendanceStatus} onValueChange={(value: any) => setAttendanceStatus(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="work_from_home">Work from home</SelectItem>
                    <SelectItem value="half_day">Half day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {actionMode === 'leave' && (
              <div>
                <Label>Leave type</Label>
                <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Why was this day missed?" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setActionDate(null); setActionMode(null); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceRegularization;
