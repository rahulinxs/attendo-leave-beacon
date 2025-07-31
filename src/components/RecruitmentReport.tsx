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
  'Total Calls', 'Total Call Duration', 'Total Submissions', 'Total Interviews', 'Offers', 'Starts'
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
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
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

  // Fetch performance data for recruitment dashboard
  const fetchReports = async () => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('performance_reports')
        .select('*')
        .eq('company_id', currentCompany.id);

      // Apply date filters based on period type
      const startDate = new Date();
      const endDate = new Date();
      
             switch (periodType) {
         case 'monthly':
           startDate.setMonth(month - 1);
           startDate.setDate(1);
           endDate.setMonth(month - 1);
           endDate.setDate(28); // Use consistent date range
           break;
                 case 'quarterly':
           const quarterStartMonth = (quarter - 1) * 3;
           startDate.setMonth(quarterStartMonth);
           startDate.setDate(1);
           endDate.setMonth(quarterStartMonth + 2);
           endDate.setDate(28);
           break;
         case 'half-yearly':
           const halfStartMonth = (half - 1) * 6;
           startDate.setMonth(halfStartMonth);
           startDate.setDate(1);
           endDate.setMonth(halfStartMonth + 5);
           endDate.setDate(28);
           break;
         case 'yearly':
           startDate.setMonth(0);
           startDate.setDate(1);
           endDate.setMonth(11);
           endDate.setDate(28);
          break;
      }
      
      startDate.setFullYear(year);
      endDate.setFullYear(year);

      query = query
        .gte('report_date', startDate.toISOString().split('T')[0])
        .lte('report_date', endDate.toISOString().split('T')[0]);

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

      setReportData(data || []);
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
                 report_date: `${year}-${month.toString().padStart(2, '0')}-28`,
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
    
    if (isEditing) {
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
        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
        onClick={() => startEditing(rowIndex, field, value)}
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
            <CardHeader>
              <CardTitle>Performance Data</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {columns.map((column) => (
                          <th key={column} className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                                                     {columns.map((column) => {
                             const field = column.toLowerCase().replace(/\s+/g, '_').replace(/[()$]/g, '');
                             let value = row[field];
                             
                             // Map team_id and user_id to names
                             if (column === 'Team') {
                               value = teamLookup[row.team_id] || 'Unknown';
                             } else if (column === 'USER NAME') {
                               value = userLookup[row.user_id] || 'Unknown';
                             }
                             
                             return (
                               <td key={column} className="border border-gray-300 px-4 py-2 text-sm">
                                 {['monster', 'dice', 'linkedin_profiles_viewed', 'linkedin_inmails_sent',
                                   'total_calls', 'total_submissions', 'total_interviews', 'offers', 'starts'].includes(field)
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