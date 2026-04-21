import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Filter, Users, UserCheck, UserX, Building, BarChart2, Loader2, RefreshCw, Eye, Pencil, ChevronLeft, ChevronRight, Download, X, Check, ChevronsUpDown } from 'lucide-react';
import Profile from './Profile';
import { Employee } from '@/types/employee';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { calculateProfileCompletion, getCompletionColor, getCompletionBgColor, getCompletionProgressColor } from '@/utils/profileCompletion';

const PROFILE_ROLES = ['admin', 'super_admin'];

interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  departments: Record<string, number>;
}

const ProfileManagement: React.FC = () => {
  const { user } = useAuth();
  const { employees = [], fetchEmployees, isLoading: employeesLoading, error: employeesError } = useEmployees();
  const { completionData, loading: completionLoading, error: completionError } = useProfileCompletion(employees.map(emp => emp.id));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  
  // Searchable combobox state
  const [consultantOpen, setConsultantOpen] = useState(false);
  const [consultantId, setConsultantId] = useState('all');
  
  // Handle errors from useEmployees
  useEffect(() => {
    if (employeesError) {
      console.error('Employees error:', employeesError);
      setError('Failed to load employees. Please try again.');
    } else {
      setError(null);
    }
  }, [employeesError]);
  
  // Calculate statistics with error handling
  const stats = useMemo<EmployeeStats>(() => {
    try {
      return employees?.reduce((acc, emp) => {
        acc.total++;
        if (emp.is_active) acc.active++;
        else acc.inactive++;
        
        const dept = emp.department || 'Unassigned';
        acc.departments[dept] = (acc.departments[dept] || 0) + 1;
        
        return acc;
      }, { total: 0, active: 0, inactive: 0, departments: {} } as EmployeeStats);
    } catch (error) {
      console.error('Error calculating stats:', error);
      return { total: 0, active: 0, inactive: 0, departments: {} };
    }
  }, [employees]);
  
  // Get unique departments for filter options
  const departments = useMemo(() => {
    const depts = new Set(employees.map(emp => emp.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  const selectedConsultant = useMemo(() => {
    if (consultantId === 'all') return null;
    return employees.find(e => e.id === consultantId) || null;
  }, [consultantId, employees]);

  // Filter employees based on search and filters
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && emp.is_active) || 
        (statusFilter === 'inactive' && !emp.is_active);
      
      const matchesDepartment = 
        departmentFilter === 'all' || 
        emp.department === departmentFilter ||
        (!emp.department && departmentFilter === 'Unassigned');
      
      // Consultant filter (from searchable combobox)
      const matchesConsultant = !selectedConsultant || emp.id === selectedConsultant.id;
      
      return matchesSearch && matchesStatus && matchesDepartment && matchesConsultant;
    });
  }, [employees, searchTerm, statusFilter, departmentFilter, selectedConsultant]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, page, pageSize]);

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, departmentFilter, consultantId]);

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const exportToCSV = () => {
    if (employees.length === 0) return;

    const headers = ['Name', 'Email', 'Role', 'Department', 'Designation', 'Status'];
    
    const csvRows = employees.map(emp => [
      `"${emp.name}"`,
      `"${emp.email}"`,
      `"${emp.role}"`,
      `"${emp.department || ''}"`,
      `"${emp.designation || ''}"`,
      `"${emp.is_active ? 'Active' : 'Inactive'}"`
    ].join(','));

    const csvContent = [
      headers.join(','),
      ...csvRows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_profiles_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setConsultantId('all');
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchEmployees();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Only allow admin/super_admin
  if (!user) {
    return (
      <div className="p-8 text-center text-lg text-yellow-600">Please log in to access this page</div>
    );
  }

  if (!PROFILE_ROLES.includes(user.role)) {
    return (
      <div className="p-8 text-center text-lg text-red-500">
        Access Denied: This section is only available to administrators.
      </div>
    );
  }
  
  // Show error if employees failed to load
  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <Button 
          onClick={() => {
            setError(null);
            fetchEmployees();
          }} 
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Call fetchEmployees only once on mount to avoid infinite loop
  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">Profile Management</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredEmployees.length} of {employees.length} employee profiles
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleRefresh} disabled={isRefreshing} variant="gradient">
                {isRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">across all departments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="flex items-center gap-2">
              <Progress value={(stats.active / Math.max(1, stats.total)) * 100} className="h-2 w-full" />
              <span className="text-xs text-muted-foreground">
                {Math.round((stats.active / Math.max(1, stats.total)) * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="w-5 h-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inactive === 0 ? 'All employees active' : 'Requires attention'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.departments).length}</div>
            <p className="text-xs text-muted-foreground">
              {Object.entries(stats.departments)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2)
                .map(([dept, count]) => `${dept} (${count})`)
                .join(', ')}
              {Object.keys(stats.departments).length > 2 ? '...' : ''}
            </p>
          </CardContent>
        </Card>
        
        {/* Profile Completion Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
            <BarChart2 className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(completionData).length > 0 
                ? Math.round(Object.values(completionData).reduce((acc, curr) => acc + curr.percentage, 0) / Object.keys(completionData).length)
                : 0}%
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={Object.keys(completionData).length > 0 
                  ? Math.round(Object.values(completionData).reduce((acc, curr) => acc + curr.percentage, 0) / Object.keys(completionData).length)
                  : 0} 
                className="h-2 w-full" 
              />
              <span className="text-xs text-muted-foreground">
                {Object.keys(completionData).length > 0 
                  ? Math.round(Object.values(completionData).reduce((acc, curr) => acc + curr.percentage, 0) / Object.keys(completionData).length)
                  : 0}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.values(completionData).filter(c => c.percentage >= 80).length} profiles complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search employees by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Consultant Filter */}
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
                      <CommandInput placeholder="Search employee..." />
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="all" onSelect={() => { setConsultantId('all'); setConsultantOpen(false); }}>
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                consultantId === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            All Employees
                          </CommandItem>
                          {employees.map((employee) => (
                            <CommandItem
                              key={employee.id}
                              value={`${employee.name} ${employee.email}`}
                              onSelect={() => { setConsultantId(employee.id); setConsultantOpen(false); }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  consultantId === employee.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {employee.name} ({employee.email})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Department</label>
                <Select 
                  value={departmentFilter} 
                  onValueChange={setDepartmentFilter}
                  disabled={Object.keys(stats.departments).length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {Object.keys(stats.departments)
                      .sort((a, b) => a.localeCompare(b))
                      .map(dept => (
                        <SelectItem key={dept} value={dept}>
                          {dept} ({stats.departments[dept]})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Summary */}
            {(searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || consultantId !== 'all') && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-800">
                  {filteredEmployees.length} of {employees.length} employees match filters
                </span>
                <Button variant="gradient" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>
        {/* Employee Grid */}
      {paginatedEmployees.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filter criteria</p>
            <Button variant="gradient" onClick={clearFilters}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedEmployees.map(emp => (
            <Card key={emp.id} className="border-0 shadow-lg card-hover">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold">{toTitleCase(emp.name)}</CardTitle>
                    <p className="text-sm text-muted-foreground">{emp.designation || 'No designation'}</p>
                  </div>
                  <Badge variant={emp.is_active ? 'default' : 'destructive'} className="ml-2">
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="text-muted-foreground">{emp.email}</p>
                  <p className="font-medium">{emp.department || 'No department'}</p>
                </div>
                
                {/* Profile Completion */}
                {completionData[emp.id] && (
                  <div className={`${getCompletionBgColor(completionData[emp.id].percentage)} p-2 rounded-lg border`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Profile Completion</span>
                      <span className={`text-xs font-bold ${getCompletionColor(completionData[emp.id].percentage)}`}>
                        {completionData[emp.id].percentage}%
                      </span>
                    </div>
                    <Progress 
                      value={completionData[emp.id].percentage} 
                      className={`h-1.5 ${getCompletionProgressColor(completionData[emp.id].percentage)}`}
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {completionData[emp.id].completedSections.slice(0, 2).map(section => (
                        <span key={section} className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs">
                          {section}
                        </span>
                      ))}
                      {completionData[emp.id].missingSections.length > 0 && (
                        <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded text-xs">
                          +{completionData[emp.id].missingSections.length} missing
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { 
                            setSelectedEmployeeId(emp.id); 
                            setViewDialogOpen(true); 
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View Profile</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { 
                            setSelectedEmployeeId(emp.id); 
                            setEditDialogOpen(true); 
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Profile</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages} - Showing {paginatedEmployees.length} of {filteredEmployees.length} employees
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="96">96</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Edit Employee Profile</DialogTitle>
          </DialogHeader>
          {selectedEmployeeId && (
            <div className="mt-4 overflow-y-auto max-h-[calc(85vh-8rem)]">
              <Profile employeeId={selectedEmployeeId} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>View Employee Profile</DialogTitle>
          </DialogHeader>
          {selectedEmployeeId && (
            <div className="mt-4 overflow-y-auto max-h-[calc(85vh-8rem)]">
              <Profile 
                employeeId={selectedEmployeeId} 
                readOnly={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileManagement;
