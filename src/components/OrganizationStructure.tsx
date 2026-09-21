import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, Network, RefreshCw, Search, ShieldCheck, UserCheck, Users, Building2, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmployeeNode {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  position: string | null;
  team_id: string | null;
  reporting_manager_id: string | null;
  is_active: boolean;
  company_id: string;
}
interface Team { id: string; name: string; }
interface AuditRow { id: string; employee_id: string; previous_reporting_manager_id: string | null; new_reporting_manager_id: string | null; previous_department: string | null; new_department: string | null; previous_team_id: string | null; new_team_id: string | null; changed_at: string; change_type: string; }

const OrganizationStructure: React.FC = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeNode[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageMode, setManageMode] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [validation, setValidation] = useState<string[]>([]);
  const [draft, setDraft] = useState({ manager: 'none', team: 'none', department: '', position: '' });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [companyExpanded, setCompanyExpanded] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const isSuperAdmin = user?.role === 'super_admin';

  const loadData = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const [{ data: employeeData, error: employeeError }, { data: teamData, error: teamError }] = await Promise.all([
      supabase.from('employees').select('id, name, email, role, department, position, team_id, reporting_manager_id, is_active, company_id').eq('company_id', currentCompany.id).eq('is_active', true).order('name').limit(1000),
      supabase.from('teams').select('id, name').eq('company_id', currentCompany.id).eq('is_active', true).order('name'),
    ]);
    if (employeeError || teamError) toast({ title: 'Load failed', description: (employeeError || teamError)?.message, variant: 'destructive' });
    setEmployees(employeeData || []);
    setTeams(teamData || []);
    if (isSuperAdmin) {
      const { data: auditData } = await supabase.from('organization_structure_audit').select('id, employee_id, previous_reporting_manager_id, new_reporting_manager_id, previous_department, new_department, previous_team_id, new_team_id, changed_at, change_type').eq('company_id', currentCompany.id).order('changed_at', { ascending: false }).limit(100);
      setAudits(auditData || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [currentCompany?.id, isSuperAdmin]);

  const employeeMap = useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees]);
  const teamMap = useMemo(() => new Map(teams.map(team => [team.id, team.name])), [teams]);
  const visibleEmployees = useMemo(() => employees.filter(employee => !search || `${employee.name} ${employee.email} ${employee.department || ''} ${employee.position || ''}`.toLowerCase().includes(search.toLowerCase())), [employees, search]);
  const selfEmployee = user?.id ? employeeMap.get(user.id) : undefined;
  const selectedEmployee = selectedId ? employeeMap.get(selectedId) : selfEmployee;
  const directReports = selectedEmployee ? employees.filter(employee => employee.reporting_manager_id === selectedEmployee.id) : [];
  const peers = selectedEmployee?.reporting_manager_id ? employees.filter(employee => employee.reporting_manager_id === selectedEmployee.reporting_manager_id && employee.id !== selectedEmployee.id) : [];
  const manager = selectedEmployee?.reporting_manager_id ? employeeMap.get(selectedEmployee.reporting_manager_id) : null;
  const reportingChain = useMemo(() => {
    const chain: EmployeeNode[] = [];
    let current = selectedEmployee?.reporting_manager_id ? employeeMap.get(selectedEmployee.reporting_manager_id) : undefined;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) { chain.push(current); seen.add(current.id); current = current.reporting_manager_id ? employeeMap.get(current.reporting_manager_id) : undefined; }
    return chain;
  }, [employeeMap, selectedEmployee]);
  const unassigned = employees.filter(employee => employee.is_active && !employee.reporting_manager_id);
  const treeRoots = useMemo(() => {
    const activeEmployees = employees.filter(employee => employee.is_active);
    const roots = activeEmployees.filter(employee => !employee.reporting_manager_id || !employeeMap.has(employee.reporting_manager_id) || !employeeMap.get(employee.reporting_manager_id)?.is_active);
    return roots.length ? roots : activeEmployees;
  }, [employeeMap, employees]);

  useEffect(() => {
    setExpandedNodes(new Set(treeRoots.map(employee => employee.id)));
  }, [treeRoots]);

  const toggleNode = (employeeId: string) => {
    setExpandedNodes(current => {
      const next = new Set(current);
      if (next.has(employeeId)) next.delete(employeeId); else next.add(employeeId);
      return next;
    });
  };

  const validateHierarchy = () => {
    const issues: string[] = [];
    employees.forEach(employee => {
      if (employee.reporting_manager_id === employee.id) issues.push(`${employee.name} reports to themselves`);
      if (employee.reporting_manager_id && !employeeMap.has(employee.reporting_manager_id)) issues.push(`${employee.name} has a missing manager`);
      const seen = new Set<string>([employee.id]);
      let current = employee.reporting_manager_id ? employeeMap.get(employee.reporting_manager_id) : undefined;
      while (current) {
        if (seen.has(current.id)) { issues.push(`${employee.name} has a circular reporting chain`); break; }
        seen.add(current.id); current = current.reporting_manager_id ? employeeMap.get(current.reporting_manager_id) : undefined;
      }
    });
    setValidation(issues);
    toast({ title: issues.length ? 'Hierarchy issues found' : 'Hierarchy is valid', description: issues.length ? `${issues.length} issue(s) require attention.` : 'No circular, missing, or self-reporting relationships found.' });
  };

  const openEdit = (employee: EmployeeNode) => {
    setSelectedId(employee.id);
    setDraft({ manager: employee.reporting_manager_id || 'none', team: employee.team_id || 'none', department: employee.department || '', position: employee.position || '' });
    setEditOpen(true);
  };
  const seniorExecutiveCandidates = employees.filter(employee => employee.is_active);
  const seniorExecutives = employees.filter(employee => employee.is_active && !employee.reporting_manager_id);
  const teamSummary = useMemo(() => teams.map(team => ({
    ...team,
    count: employees.filter(employee => employee.is_active && employee.team_id === team.id).length,
  })), [employees, teams]);
  const saveStructure = async () => {
    if (!selectedEmployee || !currentCompany?.id) return;
    const nextManager = draft.manager === 'none' ? null : draft.manager;
    if (nextManager === selectedEmployee.id) { toast({ title: 'Invalid manager', description: 'An employee cannot report to themselves.', variant: 'destructive' }); return; }
    const { error } = await supabase.rpc('update_organization_structure', { p_employee_id: selectedEmployee.id, p_company_id: currentCompany.id, p_reporting_manager_id: nextManager, p_team_id: draft.team === 'none' ? null : draft.team, p_department: draft.department || null, p_position: draft.position || null });
    if (error) { toast({ title: 'Structure update failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Structure updated', description: `${selectedEmployee.name}'s organization assignment was saved.` });
    setEditOpen(false);
    await loadData();
  };
  const moveEmployee = async (employeeId: string, managerId: string | null) => {
    if (!isSuperAdmin || !manageMode || employeeId === managerId) return;
    const employee = employeeMap.get(employeeId);
    const manager = managerId ? employeeMap.get(managerId) : null;
    if (!employee) return;
    const confirmed = window.confirm(`Move ${employee.name} from ${employee.reporting_manager_id ? employeeMap.get(employee.reporting_manager_id)?.name || 'Current manager' : 'No manager'} to ${manager?.name || currentCompany?.name || 'Company root'}?`);
    if (!confirmed) return;
    const { error } = await supabase.rpc('update_organization_structure', {
      p_employee_id: employee.id,
      p_company_id: currentCompany?.id,
      p_reporting_manager_id: managerId,
      p_team_id: employee.team_id,
      p_department: employee.department,
      p_position: employee.position,
    });
    if (error) { toast({ title: 'Move failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Hierarchy updated', description: `${employee.name} now reports to ${manager?.name || currentCompany?.name || 'the company root'}.` });
    setDraggedId(null);
    setDropTargetId(null);
    await loadData();
  };

  useEffect(() => {
    const handleTreeMove = (event: Event) => {
      const detail = (event as CustomEvent<{ employeeId: string; managerId: string }>).detail;
      if (detail?.employeeId && detail?.managerId) moveEmployee(detail.employeeId, detail.managerId);
    };
    window.addEventListener('organization-tree-move', handleTreeMove);
    return () => window.removeEventListener('organization-tree-move', handleTreeMove);
  }, [isSuperAdmin, manageMode, employeeMap, currentCompany?.id]);

  if (!currentCompany || !user) return null;
  return <div className="space-y-6">
    <Card><CardHeader><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-2xl"><Network className="h-6 w-6 text-blue-600" />Organization Structure</CardTitle><p className="text-sm text-muted-foreground">Understand your position, reporting chain, peers, and direct reports.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={loadData} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>{isSuperAdmin && <Button variant={manageMode ? 'default' : 'outline'} onClick={() => setManageMode(value => !value)}><ShieldCheck className="mr-2 h-4 w-4" />{manageMode ? 'Exit Manage Structure' : 'Manage Structure'}</Button>}</div></div></CardHeader><CardContent><div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search employees" value={search} onChange={event => setSearch(event.target.value)} /></div></CardContent></Card>

    {manageMode && isSuperAdmin && <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Assign or Move Employee</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={selectedId || ''} onValueChange={value => { const employee = employeeMap.get(value); if (employee) openEdit(employee); }}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{visibleEmployees.map(employee => <SelectItem key={employee.id} value={employee.id}>{employee.name} · {employee.position || 'No position'}</SelectItem>)}</SelectContent></Select><p className="text-sm text-muted-foreground">Select an employee to edit manager, team, department, or position.</p><Button variant="outline" onClick={validateHierarchy}><ShieldCheck className="mr-2 h-4 w-4" />Validate Hierarchy</Button></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-600" />Make Senior Executive</CardTitle></CardHeader><CardContent className="space-y-3"><Select onValueChange={value => { const employee = employeeMap.get(value); if (employee) openEdit(employee); }}><SelectTrigger><SelectValue placeholder="Select any active employee" /></SelectTrigger><SelectContent>{seniorExecutiveCandidates.map(employee => <SelectItem key={employee.id} value={employee.id}>{employee.name} · {employee.position || 'Position not set'}{employee.reporting_manager_id ? ` · Reports to ${employeeMap.get(employee.reporting_manager_id)?.name || 'manager'}` : ' · Current senior executive'}</SelectItem>)}</SelectContent></Select><p className="text-sm text-muted-foreground">In the editor, choose <strong>No reporting manager</strong> to place the employee directly below {currentCompany.name}.</p><Button variant="outline" onClick={() => setCompanyExpanded(true)}><Building2 className="mr-2 h-4 w-4" />Show Company Root</Button></CardContent></Card></div>}

    {validation.length > 0 && <Card className="border-amber-200 bg-amber-50"><CardHeader><CardTitle>Hierarchy Validation</CardTitle></CardHeader><CardContent className="space-y-1">{validation.map(issue => <p key={issue} className="text-sm text-amber-900">{issue}</p>)}</CardContent></Card>}

    <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>My Position</CardTitle></CardHeader><CardContent>{selfEmployee ? <EmployeeSummary employee={selfEmployee} teamName={teamMap.get(selfEmployee.team_id || '')} you /> : <p className="text-sm text-muted-foreground">Your employee record is not in this company scope.</p>}</CardContent></Card><Card><CardHeader><CardTitle>My Reporting Chain</CardTitle></CardHeader><CardContent className="space-y-2">{reportingChain.length ? reportingChain.map(item => <EmployeeSummary key={item.id} employee={item} teamName={teamMap.get(item.team_id || '')} />) : <p className="text-sm text-muted-foreground">No reporting manager assigned.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Peers</CardTitle></CardHeader><CardContent className="space-y-2">{peers.length ? peers.map(item => <EmployeeSummary key={item.id} employee={item} teamName={teamMap.get(item.team_id || '')} />) : <p className="text-sm text-muted-foreground">No peers found.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Direct Reports</CardTitle></CardHeader><CardContent className="space-y-2">{directReports.length ? directReports.map(item => <EmployeeSummary key={item.id} employee={item} teamName={teamMap.get(item.team_id || '')} />) : <p className="text-sm text-muted-foreground">No direct reports.</p>}</CardContent></Card></div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Network className="h-5 w-5 text-blue-600" />Organization Hierarchy</CardTitle><p className="text-sm text-muted-foreground">{currentCompany.name} is the organization root. Senior executives appear directly below it, followed by teams and reporting levels.</p></CardHeader><CardContent><div className="overflow-x-auto rounded-lg border bg-muted/20 p-4"><div className="min-w-[620px] space-y-2"><div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4"><div className="flex items-center gap-3"><button type="button" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-blue-100" onClick={() => setCompanyExpanded(value => !value)} aria-label={companyExpanded ? 'Collapse company hierarchy' : 'Expand company hierarchy'}>{companyExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</button><Building2 className="h-6 w-6 text-blue-700" /><div><p className="font-bold text-blue-950">{currentCompany.name}</p><p className="text-xs text-blue-800">Company root · {seniorExecutives.length} senior executive{seniorExecutives.length === 1 ? '' : 's'}</p></div></div><div className="mt-3 flex flex-wrap gap-2">{teamSummary.map(team => <span key={team.id} className="rounded-full border border-blue-200 bg-white px-2 py-1 text-xs text-blue-900">{team.name} · {team.count} member{team.count === 1 ? '' : 's'}</span>)}{teamSummary.length === 0 && <span className="text-xs text-blue-800">No active teams configured.</span>}</div></div>{companyExpanded && <div className="ml-6 border-l-2 border-blue-200 pl-4 pt-2 space-y-2">{treeRoots.map(root => <OrganizationTreeNode key={root.id} employee={root} employees={employees} teamMap={teamMap} currentUserId={user.id} selectedId={selectedId} expandedNodes={expandedNodes} onToggle={toggleNode} onSelect={setSelectedId} onEdit={isSuperAdmin && manageMode ? openEdit : undefined} />)}</div>}{treeRoots.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No active hierarchy records found. Use Refresh or ask a Super Admin to add a senior executive.</p>}</div></div></CardContent></Card>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Organization Directory</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleEmployees.map(employee => <button type="button" key={employee.id} onClick={() => setSelectedId(employee.id)} className={`rounded-lg border p-4 text-left hover:bg-muted/40 ${employee.id === user.id ? 'border-blue-500 bg-blue-50' : ''}`}><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{employee.name} {employee.id === user.id && <Badge className="ml-1">YOU</Badge>}</p><p className="text-sm text-muted-foreground">{employee.position || 'Position not set'}</p></div>{manageMode && isSuperAdmin && <Button type="button" size="sm" variant="outline" onClick={event => { event.stopPropagation(); openEdit(employee); }}>Edit</Button>}</div><p className="mt-2 text-xs text-muted-foreground">{employee.department || 'No department'} · {teamMap.get(employee.team_id || '') || 'No team'}</p><p className="mt-1 text-xs text-muted-foreground">Manager: {employee.reporting_manager_id ? employeeMap.get(employee.reporting_manager_id)?.name || 'Missing manager' : 'Unassigned'}</p><div className="mt-3 flex flex-wrap gap-1">{employees.filter(child => child.reporting_manager_id === employee.id).slice(0, 4).map(child => <Badge key={child.id} variant="secondary">{child.name}</Badge>)}</div></button>)}</div></CardContent></Card>

    {isSuperAdmin && manageMode && <Card><CardHeader><CardTitle>Change History</CardTitle></CardHeader><CardContent className="space-y-2">{audits.map(audit => <div key={audit.id} className="rounded-md border p-3 text-sm"><p className="font-medium">{employeeMap.get(audit.employee_id)?.name || 'Employee'} · {audit.change_type}</p><p className="text-muted-foreground">{audit.previous_reporting_manager_id ? employeeMap.get(audit.previous_reporting_manager_id)?.name : 'No manager'} → {audit.new_reporting_manager_id ? employeeMap.get(audit.new_reporting_manager_id)?.name : 'No manager'} · {new Date(audit.changed_at).toLocaleString()}</p></div>)}{audits.length === 0 && <p className="text-sm text-muted-foreground">No structure changes recorded.</p>}</CardContent></Card>}

    <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit Structure: {selectedEmployee?.name}</DialogTitle></DialogHeader>{selectedEmployee && <div className="space-y-4"><div className="rounded-md bg-muted p-3 text-sm">Current Manager: <strong>{selectedEmployee.reporting_manager_id ? employeeMap.get(selectedEmployee.reporting_manager_id)?.name || 'Missing manager' : 'Unassigned'}</strong><br />New Manager: <strong>{draft.manager === 'none' ? 'Unassigned' : employeeMap.get(draft.manager)?.name}</strong></div><Select value={draft.manager} onValueChange={value => setDraft(current => ({ ...current, manager: value }))}><SelectTrigger><SelectValue placeholder="Reporting Manager" /></SelectTrigger><SelectContent><SelectItem value="none">No reporting manager</SelectItem>{employees.filter(employee => employee.id !== selectedEmployee.id && employee.is_active).map(employee => <SelectItem key={employee.id} value={employee.id}>{employee.name} · {employee.position || 'No position'}</SelectItem>)}</SelectContent></Select><Select value={draft.team} onValueChange={value => setDraft(current => ({ ...current, team: value }))}><SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger><SelectContent><SelectItem value="none">No team</SelectItem>{teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent></Select><Input placeholder="Department" value={draft.department} onChange={event => setDraft(current => ({ ...current, department: event.target.value }))} /><Input placeholder="Designation / Position" value={draft.position} onChange={event => setDraft(current => ({ ...current, position: event.target.value }))} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={saveStructure}>Save Structure Change</Button></div></div>}</DialogContent></Dialog>
  </div>;
};

interface OrganizationTreeNodeProps {
  employee: EmployeeNode;
  employees: EmployeeNode[];
  teamMap: Map<string, string>;
  currentUserId: string;
  selectedId: string | null;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onEdit?: (employee: EmployeeNode) => void;
  canDrag?: boolean;
  draggedId?: string | null;
  dropTargetId?: string | null;
  onDragStart?: (id: string | null) => void;
  onDrop?: (employeeId: string, managerId: string | null) => void;
  onDragOver?: (id: string) => void;
}

const OrganizationTreeNode: React.FC<OrganizationTreeNodeProps> = ({ employee, employees, teamMap, currentUserId, selectedId, expandedNodes, onToggle, onSelect, onEdit, canDrag, draggedId, dropTargetId, onDragStart, onDrop, onDragOver }) => {
  const children = employees.filter(item => item.is_active && item.reporting_manager_id === employee.id);
  const expanded = expandedNodes.has(employee.id);
  const isYou = employee.id === currentUserId;
  const isSelected = employee.id === selectedId;
  const dragEnabled = Boolean(onEdit);
  return (
    <div className="relative">
      <div draggable={dragEnabled} onDragStart={event => { if (dragEnabled) event.dataTransfer.setData('text/organization-employee', employee.id); }} onDragOver={event => { if (dragEnabled) event.preventDefault(); }} onDrop={event => { event.preventDefault(); const employeeId = event.dataTransfer.getData('text/organization-employee'); if (dragEnabled && employeeId) window.dispatchEvent(new CustomEvent('organization-tree-move', { detail: { employeeId, managerId: employee.id } })); }} className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${isYou ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : isSelected ? 'border-primary bg-background' : 'bg-background'} ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}>
        <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-muted disabled:opacity-30" onClick={() => onToggle(employee.id)} disabled={!children.length} aria-label={expanded ? `Collapse ${employee.name}` : `Expand ${employee.name}`}>
          {children.length ? expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />}
        </button>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(employee.id)}>
          <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{employee.name}</span>{isYou && <Badge>YOU</Badge>}<Badge variant="secondary">{children.length} report{children.length === 1 ? '' : 's'}</Badge></div>
          <p className="truncate text-sm text-muted-foreground">{employee.position || 'Position not set'} · {employee.department || 'No department'} · {teamMap.get(employee.team_id || '') || 'No team'}</p>
        </button>
        {onEdit && <Button type="button" size="sm" variant="outline" onClick={() => onEdit(employee)}>Edit</Button>}
      </div>
      {expanded && children.length > 0 && <div className="ml-6 border-l-2 border-muted pl-4 pt-2"><div className="space-y-2">{children.map(child => <OrganizationTreeNode key={child.id} employee={child} employees={employees} teamMap={teamMap} currentUserId={currentUserId} selectedId={selectedId} expandedNodes={expandedNodes} onToggle={onToggle} onSelect={onSelect} onEdit={onEdit} canDrag={canDrag} draggedId={draggedId} dropTargetId={dropTargetId} onDragStart={onDragStart} onDrop={onDrop} onDragOver={onDragOver} />)}</div></div>}
    </div>
  );
};

const EmployeeSummary = ({ employee, teamName, you = false }: { employee: EmployeeNode; teamName?: string; you?: boolean }) => <div className="rounded-md border p-3"><div className="flex items-center justify-between gap-2"><div><p className="font-semibold">{employee.name} {you && <Badge className="ml-1">YOU</Badge>}</p><p className="text-sm text-muted-foreground">{employee.position || 'Position not set'}</p></div><Badge variant="secondary">{teamName || 'No team'}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{employee.department || 'No department'}</p></div>;

export default OrganizationStructure;
