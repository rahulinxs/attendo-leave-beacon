import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Eye } from 'lucide-react';
import Profile from './Profile';
import { Employee } from '@/types/employee';

const PROFILE_ROLES = ['admin', 'super_admin'];

const ProfileManagement: React.FC = () => {
  const { user } = useAuth();
  const { employees, fetchEmployees, isLoading: employeesLoading } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Only allow admin/super_admin
  if (!user || !PROFILE_ROLES.includes(user.role)) {
    return (
      <div className="p-8 text-center text-lg text-red-500">Access denied: Admins only</div>
    );
  }

  // Call fetchEmployees only once on mount to avoid infinite loop
  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Profile Management</h2>
      <Card className="shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="text-blue-600">Loading employees...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Department</th>
                    <th className="px-4 py-2 text-left">Designation</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-blue-50 transition-all">
                      <td className="px-4 py-2 font-medium">{emp.name}</td>
                      <td className="px-4 py-2">{emp.email}</td>
                      <td className="px-4 py-2">{emp.department || '-'}</td>
                      <td className="px-4 py-2">{emp.designation || '-'}</td>
                      <td className="px-4 py-2">
                        <Badge variant={emp.is_active ? 'default' : 'destructive'}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedEmployeeId(emp.id); setEditDialogOpen(true); }}>
                          <Pencil className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setSelectedEmployeeId(emp.id);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Profile</DialogTitle>
          </DialogHeader>
          {selectedEmployeeId && (
            <div className="mt-4">
              <Profile employeeId={selectedEmployeeId} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Employee Profile</DialogTitle>
          </DialogHeader>
          {selectedEmployeeId && (
            <div className="mt-4">
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
