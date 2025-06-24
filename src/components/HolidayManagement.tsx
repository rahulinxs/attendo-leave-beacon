
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  is_recurring?: boolean;
  created_at: string;
  updated_at: string;
}

const HolidayManagement: React.FC = () => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    is_recurring: false
  });

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching holidays:', error);
        return;
      }

      setHolidays(data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      toast({
        title: "Error",
        description: "Only admins and super admins can add holidays",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('holidays')
        .insert([{
          name: formData.name,
          date: formData.date,
          description: formData.description,
          is_recurring: formData.is_recurring
        }]);

      if (error) {
        console.error('Error adding holiday:', error);
        toast({
          title: "Error",
          description: "Failed to add holiday",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Holiday added successfully"
      });

      setFormData({ name: '', date: '', description: '', is_recurring: false });
      setShowAddForm(false);
      fetchHolidays();
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHoliday = async (holidayId: string, holidayName: string) => {
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      toast({
        title: "Error",
        description: "Only admins and super admins can delete holidays",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holidayId);

      if (error) {
        console.error('Error deleting holiday:', error);
        toast({
          title: "Error",
          description: "Failed to delete holiday",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `${holidayName} has been deleted`
      });

      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const canManageHolidays = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CalendarDays className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Holiday Management</h2>
        </div>
        {canManageHolidays && (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="gradient-primary text-white border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Holiday
          </Button>
        )}
      </div>

      {/* Add Holiday Form */}
      {showAddForm && canManageHolidays && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Add New Holiday</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <Label htmlFor="name">Holiday Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter holiday name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter holiday description"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="is_recurring"
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                />
                <Label htmlFor="is_recurring">Recurring annually</Label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={isLoading} className="gradient-primary text-white border-0">
                  Add Holiday
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Holidays List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Holidays ({holidays.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No holidays found</h3>
              <p className="text-gray-500 mb-4">No holidays have been added yet</p>
              {canManageHolidays && (
                <Button 
                  onClick={() => setShowAddForm(true)}
                  className="gradient-primary text-white border-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Holiday
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <div>
                      <h3 className="font-medium">{holiday.name}</h3>
                      <p className="text-sm text-gray-600">
                        {format(new Date(holiday.date), 'EEEE, MMMM dd, yyyy')}
                      </p>
                      {holiday.description && (
                        <p className="text-sm text-gray-500 mt-1">{holiday.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      {new Date(holiday.date) > new Date() ? 'Upcoming' : 'Past'}
                    </Badge>
                    {holiday.is_recurring && (
                      <Badge variant="outline">Recurring</Badge>
                    )}
                    {canManageHolidays && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{holiday.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteHoliday(holiday.id, holiday.name)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HolidayManagement;
