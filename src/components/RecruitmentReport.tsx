import React, { useState, useEffect, useRef } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import RecruitmentDashboard from './RecruitmentDashboard';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';

const columns = [
  'Team', 'USER NAME', 'Monster', 'Dice', 'LinkedIn Profiles viewed', 'LinkedIn InMails sent',
  'Total Calls', 'Total Call Duration', 'Total Submissions', 'Total Interviews', 'Offers', 'Starts',
  'Placed', 'Offered'
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

type PeriodType = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

const RecruitmentReport: React.FC = () => {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const today = new Date();
  const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
  const prevMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const [month, setMonth] = useState(prevMonth);
  const [year, setYear] = useState(prevMonthYear);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [quarter, setQuarter] = useState<number>(1);
  const [half, setHalf] = useState<number>(1);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'team' | 'individual'>('team');
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
  const [editingCell, setEditingCell] = useState<{rowIndex: number, field: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    columns.reduce((acc, col) => ({ ...acc, [col]: true }), {})
  );
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [hideZeroRecords, setHideZeroRecords] = useState(true);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
  }, [currentCompany?.id]);

  // Aggregate data by user for the selected period
  const aggregateDataByUser = (data: any[]) => {
    const userAggregates: Record<string, any> = {};
    
    data.forEach(record => {
      const userId = record.user_id;
      
      if (!userAggregates[userId]) {
        userAggregates[userId] = {
          id: record.id,
          user_id: userId,
          team_id: record.team_id,
          monster: 0,
          dice: 0,
          linkedin_profiles_viewed: 0,
          linkedin_inmails_sent: 0,
          total_calls: 0,
          total_call_duration: 0,
          total_submissions: 0,
          total_interviews: 0,
          offers: 0,
          starts: 0,
          placed: [], // Initialize as array to collect placed names
          offered: [], // Initialize as array to collect offered names
          report_date: record.report_date,
          company_id: record.company_id,
          user_name: record.user_name || userLookup[userId] || 'Unknown User',
          team_name: record.team_name || teamLookup[record.team_id] || 'Unknown Team'
        };
      }
      
      // Sum up all numeric fields
      const numericFields = [
        'monster', 'dice', 'linkedin_profiles_viewed', 'linkedin_inmails_sent',
        'total_calls', 'total_submissions', 'total_interviews', 'offers', 'starts'
      ];
      
      numericFields.forEach(field => {
        userAggregates[userId][field] += parseFloat(record[field] || 0);
      });
      
      // For call duration, we'll keep the latest value or sum if needed
      if (record.total_call_duration) {
        userAggregates[userId].total_call_duration = record.total_call_duration;
      }
      
      // Handle Placed and Offered as text fields (comma-separated names)
      // Skip if the value is 0, '0', empty, or not a string
      if (record.placed && 
          record.placed !== 0 && 
          record.placed !== '0' &&
          typeof record.placed === 'string' && 
          record.placed.trim() !== '') {
        const placedNames = record.placed.split(',')
          .map((name: string) => name.trim())
          .filter(name => name && name !== '0');
        userAggregates[userId].placed = [...new Set([...userAggregates[userId].placed, ...placedNames])];
      }
      
      if (record.offered && 
          record.offered !== 0 && 
          record.offered !== '0' &&
          typeof record.offered === 'string' && 
          record.offered.trim() !== '') {
        const offeredNames = record.offered.split(',')
          .map((name: string) => name.trim())
          .filter(name => name && name !== '0');
        userAggregates[userId].offered = [...new Set([...userAggregates[userId].offered, ...offeredNames])];
      }
    });
    
    // Convert arrays of names back to comma-separated strings
    return Object.values(userAggregates).map(user => ({
      ...user,
      placed: user.placed?.join(', ') || '',
      offered: user.offered?.join(', ') || ''
    }));
  };

  // Format team name by removing 'Recruitment' prefix
  const formatTeamName = (name: string) => {
    if (!name) return '';
    return name.replace(/^Recruitment\s*/i, '');
  };

  // Handle column sorting
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sort indicator for column header
  const getSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Filter out records with zero values
  const filterZeroRecords = (data: any[]) => {
    if (!hideZeroRecords) return data;
    
    return data.filter(record => {
      const totalCalls = record['total_calls'] || 0;
      const totalSubmissions = record['total_submissions'] || 0;
      const callDuration = record['total_call_duration'] || '00:00:00';
      
      // Keep record if either condition is met:
      // 1. Total calls is greater than 0, or
      // 2. Total submissions is greater than 0, or
      // 3. Call duration is not "00:00:00"
      return totalCalls > 0 || totalSubmissions > 0 || callDuration !== '00:00:00';
    });
  };

  // Sort data based on sortConfig
  const getSortedData = (data: any[]) => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      let field = sortConfig.key.toLowerCase().replace(/\s+/g, '_').replace(/[()$]/g, '');
      let aValue = a[field];
      let bValue = b[field];
      
      // Special handling for team names to sort by display name
      if (sortConfig.key === 'Team') {
        aValue = formatTeamName(teamLookup[a.team_id] || '');
        bValue = formatTeamName(teamLookup[b.team_id] || '');
      }
      
      // Handle undefined/null values
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Toggle column visibility
  const toggleColumnVisibility = (column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Fetch performance data for recruitment dashboard
  const fetchReports = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('performance_reports')
        .select(`
          *,
          user:user_id (id, name, team_id),
          team:team_id (id, name)
        `)
        .eq('company_id', currentCompany.id);

      // Apply date filters based on period type
      let startDate, endDate;
      if (periodType === 'monthly') {
        startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        endDate = `${year}-${month.toString().padStart(2, '0')}-28`;
      } else if (periodType === 'quarterly') {
        if (quarter === 1) {
          startDate = `${year}-01-01`;
          endDate = `${year}-03-31`;
        } else if (quarter === 2) {
          startDate = `${year}-04-01`;
          endDate = `${year}-06-30`;
        } else if (quarter === 3) {
          startDate = `${year}-07-01`;
          endDate = `${year}-09-30`;
        } else if (quarter === 4) {
          startDate = `${year}-10-01`;
          endDate = `${year}-12-31`;
        }
      } else if (periodType === 'half-yearly') {
        if (half === 1) {
          startDate = `${year}-01-01`;
          endDate = `${year}-06-30`;
        } else if (half === 2) {
          startDate = `${year}-07-01`;
          endDate = `${year}-12-31`;
        }
      } else if (periodType === 'yearly') {
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      }

      query = query
        .gte('report_date', startDate)
        .lte('report_date', endDate);

      // Apply filters
      if (selectedTeam && selectedTeam !== 'all') {
        query = query.eq('team_id', selectedTeam);
      }
      if (selectedUser && selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching performance reports:', error);
        toast({
          title: "Error",
          description: "Failed to fetch performance data",
          variant: "destructive",
        });
        return;
      }

      // Process the data to include user and team names
      const processedData = data?.map(record => ({
        ...record,
        user_name: record.user?.name || userLookup[record.user_id] || 'Unknown User',
        team_name: record.team?.name || teamLookup[record.team_id] || 'Unknown Team'
      })) || [];

      // For monthly view, show individual records; for other periods, aggregate by user
      const displayData = periodType === 'monthly' 
        ? processedData 
        : aggregateDataByUser(processedData);

      setReportData(displayData);
    } catch (error) {
      console.error('Error fetching performance reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch performance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentCompany?.id, month, year, periodType, quarter, half, selectedTeam, selectedUser]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportDialogOpen(true);
  };

  const parseNumber = (val: any) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const processImport = async (mode: 'replace' | 'upsert') => {
    if (!importFile) return;

    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

             const processedData = jsonData.map((row: any) => {
               const teamName = row['Team'] || '';
               const userName = row['USER NAME'] || '';
               const teamId = Object.keys(teamLookup).find(key => teamLookup[key] === teamName) || '';
               const userId = userNameToUserId[userName] || '';
               
               return {
                 team_id: teamId,
                 user_id: userId,
                 monster: parseNumber(row['Monster']),
                 dice: parseNumber(row['Dice']),
                 linkedin_profiles_viewed: parseNumber(row['LinkedIn Profiles viewed']),
                 linkedin_inmails_sent: parseNumber(row['LinkedIn InMails sent']),
                 total_calls: parseNumber(row['Total Calls']),
                 total_call_duration: row['Total Call Duration'] || '',
                 total_submissions: parseNumber(row['Total Submissions']),
                 total_interviews: parseNumber(row['Total Interviews']),
                 offers: parseNumber(row['Offers']),
                 starts: parseNumber(row['Starts']),
                 report_date: `${year}-${month.toString().padStart(1, '0')}-28`,
                 company_id: currentCompany?.id,
               };
             });

      setImportPreview(processedData);
      setReviewData(processedData);
      setReviewMode(mode);
      setReviewDialogOpen(true);
      setImportDialogOpen(false);
    } catch (error) {
      console.error('Error processing import:', error);
      toast({
        title: "Error",
        description: "Failed to process import file",
        variant: "destructive",
      });
    }
  };

  const handleCellEdit = (rowIndex: number, field: string, value: any) => {
    const updatedData = [...reportData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [field]: value };
    setReportData(updatedData);
  };

  const saveCellEdit = async (rowIndex: number, field: string) => {
    if (!editingCell) return;

    try {
      const { error } = await supabase
        .from('performance_reports')
        .update({ [field]: editValue })
        .eq('id', reportData[rowIndex].id);

      if (error) {
        console.error('Error updating cell:', error);
        toast({
          title: "Error",
          description: "Failed to update data",
          variant: "destructive",
        });
        return;
      }

      handleCellEdit(rowIndex, field, editValue);
      setEditingCell(null);
      setEditValue('');
      toast({
        title: "Success",
        description: "Data updated successfully",
      });
    } catch (error) {
      console.error('Error saving cell edit:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const startEditing = (rowIndex: number, field: string, value: any) => {
    setEditingCell({ rowIndex, field });
    setEditValue(value?.toString() || '');
  };

  const handleSaveImport = async () => {
    if (!reviewData.length) return;

    setSaving(true);
    try {
      if (reviewMode === 'replace') {
                 // Delete existing data for the period
         const startDate = new Date(year, month - 1, 1);
         const endDate = new Date(year, month - 1, 28);
        
        await supabase
          .from('performance_reports')
          .delete()
          .eq('company_id', currentCompany?.id)
          .gte('report_date', startDate.toISOString().split('T')[0])
          .lte('report_date', endDate.toISOString().split('T')[0]);
      }

      // Insert new data
      const { error } = await supabase
        .from('performance_reports')
        .insert(reviewData);

      if (error) {
        console.error('Error saving import:', error);
        toast({
          title: "Error",
          description: "Failed to save imported data",
          variant: "destructive",
        });
        return;
      }

      setReviewDialogOpen(false);
      setReviewData([]);
      setReviewMode(null);
      fetchReports();
      
      toast({
        title: "Success",
        description: "Data imported successfully",
      });
    } catch (error) {
      console.error('Error saving import:', error);
      toast({
        title: "Error",
        description: "Failed to save imported data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderEditableCell = (rowIndex: number, field: string, value: any, row: any) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.field === field;
    const isReadOnly = periodType !== 'monthly';
    
    if (isEditing && !isReadOnly) {
      return (
        <div className="flex items-center space-x-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveCellEdit(rowIndex, field);
              } else if (e.key === 'Escape') {
                setEditingCell(null);
                setEditValue('');
              }
            }}
            className="w-20 h-8 text-sm"
          />
          <Button
            size="sm"
            onClick={() => saveCellEdit(rowIndex, field)}
            className="h-6 px-2"
          >
            ✓
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingCell(null);
              setEditValue('');
            }}
            className="h-6 px-2"
          >
            ✕
          </Button>
        </div>
      );
    }

    return (
      <div
        className={`p-1 rounded ${isReadOnly ? '' : 'cursor-pointer hover:bg-gray-100'}`}
        onClick={() => !isReadOnly && startEditing(rowIndex, field, value)}
      >
        {value || 0}
      </div>
    );
  };

  if (!currentCompany?.moduleSettings?.performance_report_enabled) {
    return (
      <div className="glass-effect rounded-2xl p-8 border text-center">
        <h2 className="text-2xl font-bold mb-4">Performance Report Module Disabled</h2>
        <p className="text-gray-600">The performance report module is not enabled for your company.</p>
      </div>
    );
  }

  if (!['admin', 'super_admin', 'reporting_manager'].includes(user?.role)) {
    return (
      <div className="glass-effect rounded-2xl p-8 border text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access the recruitment reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Recruitment Report</h1>
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            Import Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Period Type</Label>
              <Select value={periodType} onValueChange={(value: PeriodType) => setPeriodType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half-yearly">Half Yearly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === 'monthly' && (
              <div>
                <Label>Month</Label>
                <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === 'quarterly' && (
              <div>
                <Label>Quarter</Label>
                <Select value={quarter.toString()} onValueChange={(value) => setQuarter(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === 'half-yearly' && (
              <div>
                <Label>Half Year</Label>
                <Select value={half.toString()} onValueChange={(value) => setHalf(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">H1</SelectItem>
                    <SelectItem value="2">H2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Year</Label>
              <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions().map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Filter By</Label>
              <Select value={filterMode} onValueChange={(value: 'team' | 'individual') => setFilterMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterMode === 'team' && (
              <div>
                <Label>Team</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                                     <SelectContent>
                     <SelectItem value="all">All Teams</SelectItem>
                     {Object.entries(teamLookup).map(([id, name]) => (
                       <SelectItem key={id} value={id}>
                         {name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                </Select>
              </div>
            )}

            {filterMode === 'individual' && (
              <div>
                <Label>User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                                     <SelectContent>
                     <SelectItem value="all">All Users</SelectItem>
                     {Object.entries(userLookup).map(([id, name]) => (
                       <SelectItem key={id} value={id}>
                         {name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="data">Data Table</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <RecruitmentDashboard performanceData={reportData} />
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Performance Data</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 border-r border-gray-200 pr-3">
                  <input
                    type="checkbox"
                    id="hideZeroRecords"
                    checked={hideZeroRecords}
                    onChange={() => setHideZeroRecords(!hideZeroRecords)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hideZeroRecords" className="text-sm text-gray-700 cursor-pointer">
                    Hide Zero Records
                  </label>
                </div>
                <div className="relative" ref={columnMenuRef}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                  >
                    <span className="mr-2">Columns</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Button>
                {showColumnMenu && (
                  <div 
                    className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
                      Show/Hide Columns
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {columns.map((column) => (
                        <label 
                          key={column} 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[column]}
                            onChange={() => toggleColumnVisibility(column)}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="truncate">{column}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto max-w-full -mx-4 md:mx-0">
                  <div className="min-w-max md:w-full px-4 md:px-0">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          {columns.map((column) => (
                            visibleColumns[column] && (
                              <th 
                                key={column} 
                                className="border border-gray-300 px-2 py-1 text-left text-xs font-bold whitespace-nowrap bg-gray-100 cursor-pointer hover:bg-gray-200"
                                onClick={() => requestSort(column)}
                              >
                                {column}{getSortIndicator(column)}
                              </th>
                            )
                          ))}
                        </tr>
                      </thead>
                    <tbody>
                      {filterZeroRecords(getSortedData(reportData)).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {columns.map((column) => {
                            if (!visibleColumns[column]) return null;
                            
                            const field = column.toLowerCase().replace(/\s+/g, '_').replace(/[()$]/g, '');
                            let value = row[field];
                            
                            // Map team_id and user_id to names
                            if (column === 'Team') {
                              value = formatTeamName(teamLookup[row.team_id] || 'Unknown');
                            } else if (column === 'USER NAME') {
                              value = userLookup[row.user_id] || 'Unknown';
                            }
                            
                            return (
                              <td 
                                key={column} 
                                className="border border-gray-300 px-2 py-1 text-xs whitespace-nowrap"
                              >
                                {['monster', 'dice', 'linkedin_profiles_viewed', 'linkedin_inmails_sent',
                                  'total_calls', 'total_submissions', 'total_interviews', 'offers', 'starts',
                                  'placed', 'offered'].includes(field)
                                  ? renderEditableCell(rowIndex, field, value, row)
                                  : (value || '')
                                }
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Performance Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Choose how to import the data:</p>
            <div className="flex space-x-2">
              <Button onClick={() => processImport('replace')}>
                Replace Existing Data
              </Button>
              <Button onClick={() => processImport('upsert')}>
                Add to Existing Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Import Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    {columns.map((column) => (
                      <th key={column} className="border border-gray-300 px-2 py-1 text-left text-xs">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reviewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {columns.map((column) => {
                        const field = column.toLowerCase().replace(/\s+/g, '_').replace(/[()$]/g, '');
                        return (
                          <td key={column} className="border border-gray-300 px-2 py-1 text-xs">
                            {row[field] || ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveImport} disabled={saving}>
                {saving ? 'Saving...' : 'Save Data'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruitmentReport; 