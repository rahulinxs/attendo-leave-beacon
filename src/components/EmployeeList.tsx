import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Users, Mail, Building, Briefcase, UserPlus, Trash2, Edit } from 'lucide-react';
import EditEmployeeForm from './EditEmployeeForm';
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
import { useCompany } from '@/contexts/CompanyContext';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
  hire_date?: string;
  is_active: boolean;
  team_id?: string;
  reporting_manager_id?: string;
  company_id?: string;
}

interface EmployeeListProps {
  onAddEmployee: () => void;
  refreshTrigger?: number;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ onAddEmployee, refreshTrigger }) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const fetchEmployees = async () => {
    if (!currentCompany) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }
    try {
      console.log('Fetching employees for company:', currentCompany.id);
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      console.log('Employees fetched:', employees);
      setEmployees((employees as any[]) || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canRemoveEmployee = (employee: Employee) => {
    if (!user || !['admin', 'super_admin'].includes(user.role)) return false;
    if (employee.id === user.id) return false; // Can't remove self
    if (user.role === 'admin' && employee.role === 'super_admin') return false; // Admin can't remove super admin
    if (employee.role === 'admin' && user.role === 'admin') return false; // Admin can't remove other admins
    return true;
  };

  const canEditEmployee = (employee: Employee) => {
    if (!user || !['admin', 'super_admin'].includes(user.role)) return false;
    if (employee.id === user.id) return false; // Can't edit self
    if (user.role === 'admin' && employee.role === 'super_admin') return false; // Admin can't edit super admin
    return true;
  };

  const handleRemoveEmployee = async (employeeId: string, employeeName: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee || !canRemoveEmployee(employee)) {
      toast({
        title: "Error",
        description: "You don't have permission to remove this employee",
        variant: "destructive"
      });
      return;
    }

    setRemovingId(employeeId);
    try {
      // Mark employee as inactive instead of deleting
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', employeeId);

      if (error) {
        console.error('Error removing employee:', error);
        toast({
          title: "Error",
          description: "Failed to remove employee",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `${employeeName} has been removed successfully`,
      });

      // Refresh the list
      fetchEmployees();
    } catch (error) {
      console.error('Error removing employee:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleEditSuccess = () => {
    setEditingEmployee(null);
    fetchEmployees();
  };

  useEffect(() => {
    fetchEmployees();
  }, [refreshTrigger, currentCompany]);

  const canAddEmployee = user && ['admin', 'super_admin'].includes(user.role);

  if (!currentCompany) {
    return (
      <div className="p-8 text-center text-gray-500">
        No company selected. Please select a company to view employees.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (editingEmployee) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => setEditingEmployee(null)}
            className="p-2"
          >
            ← Back
          </Button>
          <h1 className="text-xl font-bold">Edit Employee</h1>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent>
            <EditEmployeeForm 
              employee={editingEmployee}
              onSuccess={handleEditSuccess} 
              onCancel={() => setEditingEmployee(null)} 
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold">Employees ({employees.length})</h2>
        </div>
        {canAddEmployee && (
          <Button 
            onClick={onAddEmployee}
            className="gradient-primary text-white border-0"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        )}
      </div>

      {employees.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 text-center">
            <Users className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500 mb-3">Get started by adding your first employee</p>
            {canAddEmployee && (
              <Button 
                onClick={onAddEmployee}
                className="gradient-primary text-white border-0"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map((employee) => (
            <Card key={employee.id} className="border-0 shadow-lg card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{employee.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={employee.role === 'admin' || employee.role === 'super_admin' ? 'default' : 'secondary'}>
                      {employee.role.replace('_', ' ')}
                    </Badge>
                    <div className="flex space-x-1">
                      {canEditEmployee(employee) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setEditingEmployee(employee)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                      {canRemoveEmployee(employee) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={removingId === employee.id}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Employee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {employee.name}? This action will deactivate their account and they will no longer be able to access the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveEmployee(employee.id, employee.name)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-3 h-3" />
                  <span className="text-sm">{employee.email}</span>
                </div>
                
                {employee.department && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Building className="w-3 h-3" />
                    <span className="text-sm">{employee.department}</span>
                  </div>
                )}
                
                {employee.position && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Briefcase className="w-3 h-3" />
                    <span className="text-sm">{employee.position}</span>
                  </div>
                )}

                {employee.hire_date && (
                  <div className="text-xs text-gray-500 pt-1">
                    Joined: {new Date(employee.hire_date).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
