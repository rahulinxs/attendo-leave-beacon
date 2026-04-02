import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Mail, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface BulkPasswordResetResult {
  success: number;
  failed: number;
  failedEmails: string[];
  errors: string[];
}

const BulkPasswordReset: React.FC = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resetResult, setResetResult] = useState<BulkPasswordResetResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Check if user is super admin
  const isSuperAdmin = user?.role === 'super_admin';

  // Fetch all employees for the current company
  const fetchEmployees = async () => {
    if (!isSuperAdmin || !currentCompany?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, role, is_active')
        .eq('company_id', currentCompany.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: "Error",
          description: "Failed to fetch employees. Please try again.",
          variant: "destructive"
        });
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentCompany?.id]);

  // Filter employees based on search term and status
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && employee.is_active) ||
                         (filter === 'inactive' && !employee.is_active);
    return matchesSearch && matchesFilter;
  });

  // Select/deselect all employees
  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    }
  };

  // Toggle employee selection
  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Send bulk password reset emails
  const sendBulkPasswordReset = async () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one employee to reset password.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    const result: BulkPasswordResetResult = {
      success: 0,
      failed: 0,
      failedEmails: [],
      errors: []
    };

    try {
      // Get selected employees
      const selectedEmployeeData = employees.filter(emp => 
        selectedEmployees.includes(emp.id)
      );

      // Send reset emails one by one
      for (const employee of selectedEmployeeData) {
        try {
          const redirectUrl = `https://attendedge.netlify.app/reset-password?type=recovery`;
          
          const { error } = await supabase.auth.resetPasswordForEmail(employee.email, {
            redirectTo: redirectUrl,
          });

          if (error) {
            result.failed++;
            result.failedEmails.push(employee.email);
            result.errors.push(`${employee.email}: ${error.message}`);
          } else {
            result.success++;
          }

          // Small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error: any) {
          result.failed++;
          result.failedEmails.push(employee.email);
          result.errors.push(`${employee.email}: ${error.message}`);
        }
      }

      setResetResult(result);
      setShowResultDialog(true);
      setSelectedEmployees([]);

      // Show success notification
      toast({
        title: "Password Reset Sent",
        description: `Successfully sent reset emails to ${result.success} employees.`,
        variant: "default"
      });

    } catch (error) {
      console.error('Error sending bulk password reset:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset emails. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
      setShowConfirmDialog(false);
    }
  };

  // If not super admin, don't render
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ShieldCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">Only Super Administrators can access bulk password reset functionality.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Password Reset</h2>
          <p className="text-gray-600 mt-1">Send password reset emails to multiple employees</p>
        </div>
        <Button 
          onClick={fetchEmployees}
          variant="outline"
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{employees.length}</p>
                <p className="text-sm text-gray-600">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{employees.filter(e => e.is_active).length}</p>
                <p className="text-sm text-gray-600">Active Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3">
                <UserX className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{employees.filter(e => !e.is_active).length}</p>
                <p className="text-sm text-gray-600">Inactive Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Employees</Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
              >
                All ({employees.length})
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                onClick={() => setFilter('active')}
                size="sm"
              >
                Active ({employees.filter(e => e.is_active).length})
              </Button>
              <Button
                variant={filter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setFilter('inactive')}
                size="sm"
              >
                Inactive ({employees.filter(e => !e.is_active).length})
              </Button>
            </div>
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                id="select-all"
                checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="font-medium">
                Select All ({selectedEmployees.length} of {filteredEmployees.length})
              </Label>
            </div>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={selectedEmployees.length === 0 || isSending}
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {isSending ? 'Sending...' : `Send Reset Emails (${selectedEmployees.length})`}
            </Button>
          </div>

          {/* Progress */}
          {isSending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Sending password reset emails...</span>
                <span>{selectedEmployees.length} employees</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          )}

          {/* Employee List */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading employees...</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{employee.name}</span>
                        <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">{employee.role}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{employee.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Password Reset</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send password reset emails to <strong>{selectedEmployees.length}</strong> employee(s). 
              Each employee will receive an email with a link to reset their password.
              <br /><br />
              <strong>This action cannot be undone.</strong> Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={sendBulkPasswordReset}
              disabled={isSending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSending ? 'Sending...' : 'Send Reset Emails'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Password Reset Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {resetResult && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{resetResult.success}</p>
                    <p className="text-sm text-green-600">Successful</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{resetResult.failed}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </div>
                </div>

                {resetResult.failed > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">Failed Emails:</h4>
                    <div className="max-h-32 overflow-y-auto bg-red-50 rounded p-3">
                      {resetResult.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-700">{error}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkPasswordReset;
