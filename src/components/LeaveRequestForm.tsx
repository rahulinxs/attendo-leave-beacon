import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Calendar, Send, X } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import {
  formatLeaveDays,
  resolveLeaveTotalDays,
  type DurationType,
  type LeaveSession,
} from '@/utils/leaveDuration';
import { hasConflictingLeave } from '@/services/leaveOverlap';

interface LeaveType {
  id: string;
  name: string;
  max_days_per_year: number;
}

interface LeaveRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    durationType: 'full_day' as DurationType,
    session: '' as '' | LeaveSession,
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, [currentCompany]);

  const fetchLeaveTypes = async () => {
    if (!currentCompany?.id) return;
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('id, name, max_days_per_year')
        .eq('is_active', true)
        .eq('company_id', currentCompany.id);

      if (error) {
        console.error('Error fetching leave types:', error);
        return;
      }

      setLeaveTypes(data || []);
    } catch (error) {
      console.error('Error fetching leave types:', error);
    }
  };

  const effectiveEndDate =
    formData.durationType === 'half_day' ? formData.startDate : formData.endDate;
  const totalDays = resolveLeaveTotalDays(
    formData.durationType,
    formData.startDate,
    effectiveEndDate
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !currentCompany) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a leave request",
        variant: "destructive"
      });
      return;
    }

    if (!formData.leaveTypeId || !formData.startDate || !formData.reason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (formData.durationType === 'full_day' && !formData.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (formData.durationType === 'half_day' && !formData.session) {
      toast({
        title: "Error",
        description: "Please choose first half or second half",
        variant: "destructive"
      });
      return;
    }

    if (formData.durationType === 'full_day' && new Date(formData.endDate) < new Date(formData.startDate)) {
      toast({
        title: "Error",
        description: "End date cannot be before start date",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const startDate = formData.startDate;
      const endDate = formData.durationType === 'half_day' ? formData.startDate : formData.endDate;
      const session = formData.durationType === 'half_day' ? formData.session : null;

      const conflict = await hasConflictingLeave({
        employeeId: user.id,
        companyId: currentCompany.id,
        startDate,
        endDate,
        durationType: formData.durationType,
        session: session || null,
      });

      if (conflict) {
        toast({
          title: "Error",
          description: "This overlaps an existing pending or approved leave for the same period",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: user.id,
          company_id: currentCompany.id,
          leave_type_id: formData.leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          duration_type: formData.durationType,
          session,
          reason: formData.reason,
          status: 'pending'
        });

      if (error) {
        console.error('Submit leave request error:', error);
        toast({
          title: "Error",
          description: "Failed to submit leave request",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });

      // Reset form
      setFormData({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: '',
        durationType: 'full_day',
        session: '',
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Submit Leave Request</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select 
                value={formData.leaveTypeId} 
                onValueChange={(value) => setFormData({...formData, leaveTypeId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} (Max: {type.max_days_per_year} days/year)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Duration *</Label>
              <Select
                value={formData.durationType}
                onValueChange={(value: DurationType) =>
                  setFormData({
                    ...formData,
                    durationType: value,
                    endDate: value === 'half_day' ? formData.startDate : formData.endDate,
                    session: value === 'half_day' ? formData.session : '',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">Full day</SelectItem>
                  <SelectItem value="half_day">Half day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">{formData.durationType === 'half_day' ? 'Leave Date *' : 'Start Date *'}</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    startDate: e.target.value,
                    endDate: formData.durationType === 'half_day' ? e.target.value : formData.endDate,
                  })
                }
                required
              />
            </div>

            {formData.durationType === 'full_day' ? (
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  required
                />
              </div>
            ) : (
              <div>
                <Label>Session *</Label>
                <Select
                  value={formData.session}
                  onValueChange={(value: LeaveSession) => setFormData({...formData, session: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="First or second half" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_half">First half</SelectItem>
                    <SelectItem value="second_half">Second half</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {totalDays > 0 && (
              <div className="md:col-span-2">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Total Days:</strong> {formatLeaveDays(totalDays)}
                    {formData.durationType === 'half_day' && formData.session
                      ? ` (${formData.session === 'first_half' ? 'First half' : 'Second half'})`
                      : ''}
                  </p>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a detailed reason for your leave request..."
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                rows={4}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isLoading}
              variant="gradient"
            >
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LeaveRequestForm;
