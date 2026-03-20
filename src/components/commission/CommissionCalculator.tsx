import React, { useState, useMemo } from 'react';
import { useCommission } from '@/contexts/CommissionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';

const commissionFormSchema = z.object({
  consultant_name: z.string().min(1, 'Consultant name is required'),
  client: z.string().min(1, 'Client is required'),
  end_client: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(), // Will store converted end date
  commission_start_monthyear: z.string().min(1, 'Commission start month/year is required'),
  commission_end_monthyear: z.string().min(1, 'Commission end month/year is required'),
  commission_cycle: z.enum(['Monthly', 'Quarterly']),
  hours: z.number().min(0, 'Hours must be positive'),
  bill_rate: z.number().min(0, 'Bill rate must be positive'),
  pay_rate: z.number().min(0, 'Pay rate must be positive'),
  load_percent: z.number().min(0, 'Load percent must be positive'),
  recruiter_name: z.string().optional(),
  recruiter_split_percent: z.number().min(0).max(100).default(0),
  recruitment_lead_name: z.string().optional(),
  recruitment_lead_split_percent: z.number().min(0).max(100).default(0),
  sales_name: z.string().optional(),
  sales_split_percent: z.number().min(0).max(100).default(0),
  sales_lead_name: z.string().optional(),
  sales_lead_split_percent: z.number().min(0).max(100).default(0),
}).refine((data) => {
  const totalSplit = data.recruiter_split_percent + data.recruitment_lead_split_percent + 
                 data.sales_split_percent + data.sales_lead_split_percent;
  return totalSplit <= 100;
}, {
  message: 'Total split percentage cannot exceed 100%',
  path: ['recruiter_split_percent']
}).refine((data) => {
  // Validate commission end date is after start date
  if (data.commission_start_monthyear && data.commission_end_monthyear) {
    // Parse month-year strings like "June 2024"
    const startParts = data.commission_start_monthyear.split(' ');
    const endParts = data.commission_end_monthyear.split(' ');
    
    if (startParts.length === 2 && endParts.length === 2) {
      const [startMonth, startYear] = startParts;
      const [endMonth, endYear] = endParts;
      
      // Convert month name to number
      const monthMap: { [key: string]: number } = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      
      const startMonthNum = monthMap[startMonth];
      const endMonthNum = monthMap[endMonth];
      
      if (startMonthNum !== undefined && endMonthNum !== undefined) {
        const startDate = new Date(parseInt(startYear), startMonthNum, 1);
        const endDate = new Date(parseInt(endYear), endMonthNum, 1);
        
        return endDate >= startDate;
      }
    }
  }
  return true;
}, {
  message: 'Commission end date must be after or same as start date',
  path: ['commission_end_monthyear']
}).refine((data) => {
  // Validate commission duration covers engagement timeline
  if (data.start_date && data.commission_start_monthyear && data.commission_end_monthyear) {
    const engagementStart = new Date(data.start_date);
    
    // Parse month-year strings like "June 2024"
    const startParts = data.commission_start_monthyear.split(' ');
    const endParts = data.commission_end_monthyear.split(' ');
    
    if (startParts.length === 2 && endParts.length === 2) {
      const [startMonth, startYear] = startParts;
      const [endMonth, endYear] = endParts;
      
      // Convert month name to number
      const monthMap: { [key: string]: number } = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      
      const startMonthNum = monthMap[startMonth];
      const endMonthNum = monthMap[endMonth];
      
      if (startMonthNum !== undefined && endMonthNum !== undefined) {
        const commissionStartDate = new Date(parseInt(startYear), startMonthNum, 1);
        const commissionEndDate = new Date(parseInt(endYear), endMonthNum, 1);
        commissionEndDate.setMonth(commissionEndDate.getMonth() + 1, 0); // Set to last day of month
        
        // Commission duration must start after engagement start date
        // AND must cover the engagement period
        return commissionStartDate >= engagementStart && commissionEndDate >= engagementStart;
      }
    }
  }
  return true;
}, {
  message: 'Commission duration must start after engagement start date and cover the engagement period',
  path: ['commission_start_monthyear']
});

type CommissionFormData = z.infer<typeof commissionFormSchema>;

const CommissionCalculator: React.FC = () => {
  const { createEngagement, updateEngagement, deleteEngagement, isSaving, employees, isLoadingEmployees, engagements } = useCommission();
  const [showPreview, setShowPreview] = useState(false);
  const [selectedEngagement, setSelectedEngagement] = useState<CommissionEngagement | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Handle consultant name change to auto-fill from past records
  const handleConsultantNameChange = (consultantName: string) => {
    form.setValue('consultant_name', consultantName);
    
    if (consultantName && consultantName.trim()) {
      // Find the most recent engagement for this consultant
      const consultantEngagements = engagements
        .filter(eng => eng.consultant_name.toLowerCase() === consultantName.toLowerCase())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      if (consultantEngagements.length > 0) {
        const latestEngagement = consultantEngagements[0];
        console.log('Found latest engagement for consultant:', latestEngagement);
        
        // Auto-fill all fields except the ones user needs to input
        form.setValue('client', latestEngagement.client || '');
        form.setValue('end_client', latestEngagement.end_client || '');
        form.setValue('start_date', latestEngagement.start_date || '');
        form.setValue('bill_rate', latestEngagement.bill_rate || 0);
        form.setValue('pay_rate', latestEngagement.pay_rate || 0);
        form.setValue('load_percent', latestEngagement.load_percent || 30);
        
        // Auto-fill team members
        form.setValue('recruiter_name', latestEngagement.recruiter_name || '');
        form.setValue('recruiter_split_percent', latestEngagement.recruiter_split_percent || 0);
        form.setValue('recruitment_lead_name', latestEngagement.recruitment_lead_name || '');
        form.setValue('recruitment_lead_split_percent', latestEngagement.recruitment_lead_split_percent || 0);
        form.setValue('sales_name', latestEngagement.sales_name || '');
        form.setValue('sales_split_percent', latestEngagement.sales_split_percent || 0);
        form.setValue('sales_lead_name', latestEngagement.sales_lead_name || '');
        form.setValue('sales_lead_split_percent', latestEngagement.sales_lead_split_percent || 0);
        
        // Set commission cycle to trigger auto-population of dates
        const commissionCycle = latestEngagement.commission_cycle || 'Monthly';
        form.setValue('commission_cycle', commissionCycle);
        handleCommissionCycleChange(commissionCycle);
        
        // Don't auto-fill these fields - user needs to input them:
        // - commission_start_monthyear (will be auto-populated by cycle change)
        // - commission_end_monthyear (will be auto-populated by cycle change)
        // - hours (user needs to input)
      }
    } else {
      // Clear all auto-filled fields if consultant name is cleared
      form.setValue('client', '');
      form.setValue('end_client', '');
      form.setValue('start_date', '');
      form.setValue('bill_rate', 0);
      form.setValue('pay_rate', 0);
      form.setValue('load_percent', 30);
      form.setValue('recruiter_name', '');
      form.setValue('recruiter_split_percent', 0);
      form.setValue('recruitment_lead_name', '');
      form.setValue('recruitment_lead_split_percent', 0);
      form.setValue('sales_name', '');
      form.setValue('sales_split_percent', 0);
      form.setValue('sales_lead_name', '');
      form.setValue('sales_lead_split_percent', 0);
      form.setValue('commission_cycle', 'Monthly');
      form.setValue('commission_start_monthyear', '');
      form.setValue('commission_end_monthyear', '');
      form.setValue('hours', 0);
    }
  };

  // Handle commission cycle change
  const handleCommissionCycleChange = (value: string) => {
    console.log('Commission cycle changed to:', value);
    form.setValue('commission_cycle', value as 'Monthly' | 'Quarterly');
    
    if (value === 'Quarterly') {
      // Auto-select recent past 3 months for quarterly
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Calculate start of quarter (3 months ago)
      const quarterStartMonth = currentMonth - 2;
      const quarterStartYear = quarterStartMonth < 0 ? currentYear - 1 : currentYear;
      const adjustedQuarterStartMonth = quarterStartMonth < 0 ? quarterStartMonth + 12 : quarterStartMonth;
      
      // Generate month-year options for dropdowns
      const startMonthYear = `${getMonthName(adjustedQuarterStartMonth)} ${quarterStartYear}`;
      const endMonthYear = `${getMonthName(currentMonth)} ${currentYear}`;
      
      console.log('Setting quarterly dates:', { startMonthYear, endMonthYear });
      form.setValue('commission_start_monthyear', startMonthYear);
      form.setValue('commission_end_monthyear', endMonthYear);
    } else if (value === 'Monthly') {
      // For monthly, set last month (previous month)
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Calculate last month
      const lastMonth = currentMonth - 1;
      const lastMonthYear = lastMonth < 0 ? currentYear - 1 : currentYear;
      const adjustedLastMonth = lastMonth < 0 ? lastMonth + 12 : lastMonth;
      
      const monthYear = `${getMonthName(adjustedLastMonth)} ${lastMonthYear}`;
      
      console.log('Setting monthly date:', monthYear);
      form.setValue('commission_start_monthyear', monthYear);
      form.setValue('commission_end_monthyear', monthYear);
    }
    
    // Trigger form update to re-render
    form.trigger();
  };

  // Helper function to get month name
  const getMonthName = (monthIndex: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
  };

  // Generate month-year options for dropdowns
  const generateMonthYearOptions = () => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Generate options for current year and previous year
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      for (let month = 0; month < 12; month++) {
        const monthYear = `${getMonthName(month)} ${year}`;
        // Use the same format for both label and value
        options.push({ label: monthYear, value: monthYear });
      }
    }
    return options;
  };

  // Transform employees for combobox
  const employeeOptions = employees.map(emp => ({
    value: emp.full_name,
    label: emp.full_name,
    description: emp.email
  }));

  // Transform engagements for combobox
  const engagementOptions = engagements.map(engagement => ({
    value: engagement.id,
    label: `${engagement.consultant_name} - ${engagement.client}`,
    description: `${engagement.start_date} • ${formatCurrency(engagement.total_commission)} commission`
  }));

  // Handle engagement selection for editing
  const handleEngagementSelect = (engagementId: string) => {
    const engagement = engagements.find(e => e.id === engagementId);
    if (engagement) {
      setSelectedEngagement(engagement);
      setIsEditMode(true);
      
      // Populate form with engagement data
      form.reset({
        consultant_name: engagement.consultant_name,
        client: engagement.client,
        end_client: engagement.end_client || '',
        start_date: engagement.start_date,
        end_date: engagement.end_date || '',
        commission_start_monthyear: engagement.commission_start_monthyear || '',
        commission_end_monthyear: engagement.commission_end_monthyear || '',
        commission_cycle: engagement.commission_cycle,
        hours: engagement.hours,
        bill_rate: engagement.bill_rate,
        pay_rate: engagement.pay_rate,
        load_percent: engagement.load_percent,
        recruiter_name: engagement.recruiter_name || '',
        recruiter_split_percent: engagement.recruiter_split_percent,
        recruitment_lead_name: engagement.recruitment_lead_name || '',
        recruitment_lead_split_percent: engagement.recruitment_lead_split_percent,
        sales_name: engagement.sales_name || '',
        sales_split_percent: engagement.sales_split_percent,
        sales_lead_name: engagement.sales_lead_name || '',
        sales_lead_split_percent: engagement.sales_lead_split_percent,
      });
      
      setShowPreview(true);
    }
  };

  // Handle creating new engagement
  const handleNewEngagement = () => {
    setSelectedEngagement(null);
    setIsEditMode(false);
    form.reset();
    setShowPreview(false);
  };

  // Handle deleting engagement
  const handleDeleteEngagement = async () => {
    if (!selectedEngagement) return;
    
    if (window.confirm(`Are you sure you want to delete the engagement for ${selectedEngagement.consultant_name} - ${selectedEngagement.client}? This action cannot be undone.`)) {
      try {
        await deleteEngagement(selectedEngagement.id);
        setSelectedEngagement(null);
        setIsEditMode(false);
        form.reset();
        setShowPreview(false);
      } catch (error: any) {
        console.error('Error deleting engagement:', error);
      }
    }
  };

  // Helper function to convert month/year string to date
  const convertMonthYearToDate = (monthYear: string, isEndOfMonth: boolean = false, engagementStartDate?: string): string => {
    if (!monthYear || monthYear.trim() === '') return '';
    
    const parts = monthYear.trim().split(' ');
    if (parts.length !== 2) return '';
    
    const [monthName, year] = parts;
    const monthMap: { [key: string]: number } = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    const monthNum = monthMap[monthName.trim()];
    const yearNum = parseInt(year.trim());
    
    if (monthNum === undefined || isNaN(yearNum)) return '';
    
    try {
      let date: Date;
      
      if (!isEndOfMonth && engagementStartDate) {
        // For start date: check if engagement start is in the same month
        const engagementDate = new Date(engagementStartDate);
        const engagementMonth = engagementDate.getMonth();
        const engagementYear = engagementDate.getFullYear();
        
        if (engagementMonth === monthNum && engagementYear === yearNum) {
          // Use engagement start date instead of 1st of month
          date = new Date(engagementStartDate);
        } else {
          // Use 1st of month
          date = new Date(yearNum, monthNum, 1);
        }
      } else {
        // For end date or when no engagement date provided
        date = new Date(yearNum, monthNum, 1);
        if (isEndOfMonth) {
          date.setMonth(date.getMonth() + 1, 0); // Set to last day of month
        }
      }
      
      // Validate date is valid
      if (isNaN(date.getTime())) return '';
      
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch (error) {
      return '';
    }
  };

  // Modified submit handler
  const onSubmit = async (data: CommissionFormData) => {
    // Convert month/year strings to proper dates
    const convertedStartDate = convertMonthYearToDate(data.commission_start_monthyear, false, data.start_date);
    
    const submissionData = {
      ...data,
      // Only set start_date if conversion is successful
      start_date: convertedStartDate || data.start_date, // Use converted start date or original
      // Don't auto-set end_date - keep user's input or leave as is
    };
    
    if (isEditMode && selectedEngagement) {
      // Update existing engagement
      try {
        await updateEngagement(selectedEngagement.id, submissionData);
        form.reset();
        setShowPreview(false);
        setSelectedEngagement(null);
        setIsEditMode(false);
      } catch (error) {
        console.error('Error updating engagement:', error);
      }
    } else {
      // Create new engagement
      await createEngagement(submissionData);
      form.reset();
      setShowPreview(false);
      setSelectedEngagement(null);
      setIsEditMode(false);
    }
  };

  const form = useForm<CommissionFormData>({
    resolver: zodResolver(commissionFormSchema),
    defaultValues: {
      consultant_name: '',
      client: '',
      end_client: '',
      start_date: '',
      end_date: '',
      commission_start_monthyear: '',
      commission_end_monthyear: '',
      commission_cycle: 'Monthly',
      hours: 0,
      bill_rate: 0,
      pay_rate: 0,
      load_percent: 30,
      recruiter_split_percent: 0,
      recruitment_lead_split_percent: 0,
      sales_split_percent: 0,
      sales_lead_split_percent: 0,
    },
  });

  const watchedValues = form.watch();
  
  // Calculate values in real-time
  const calculations = React.useMemo(() => {
    const { bill_rate, pay_rate, load_percent, hours, 
            recruiter_split_percent, recruitment_lead_split_percent, 
            sales_split_percent, sales_lead_split_percent } = watchedValues;

    // Step 1: Total Cost/hr
    const total_cost_per_hour = pay_rate * (1 + load_percent / 100);
    
    // Step 2: Margin/hr
    const margin_per_hour = bill_rate - total_cost_per_hour;
    
    // Step 3: Total Margin
    const total_margin = margin_per_hour * hours;
    
    // Step 4: Individual commissions
    const recruiter_commission = total_margin * recruiter_split_percent / 100;
    const recruitment_lead_commission = total_margin * recruitment_lead_split_percent / 100;
    const sales_commission = total_margin * sales_split_percent / 100;
    const sales_lead_commission = total_margin * sales_lead_split_percent / 100;
    
    // Step 5: Hourly commissions
    const recruiter_commission_per_hour = margin_per_hour * recruiter_split_percent / 100;
    const recruitment_lead_commission_per_hour = margin_per_hour * recruitment_lead_split_percent / 100;
    const sales_commission_per_hour = margin_per_hour * sales_split_percent / 100;
    const sales_lead_commission_per_hour = margin_per_hour * sales_lead_split_percent / 100;
    
    // Step 6: Total Commission
    const total_commission = recruiter_commission + recruitment_lead_commission + sales_commission + sales_lead_commission;
    
    // Total hourly commission
    const total_commission_per_hour = recruiter_commission_per_hour + recruitment_lead_commission_per_hour + sales_commission_per_hour + sales_lead_commission_per_hour;
    
    // Margin percentage
    const margin_percent = bill_rate > 0 ? (margin_per_hour / bill_rate) * 100 : 0;
    
    // Unallocated amount
    const total_split_percent = recruiter_split_percent + recruitment_lead_split_percent + sales_split_percent + sales_lead_split_percent;
    const unallocated_amount = total_margin * (100 - total_split_percent) / 100;

    return {
      total_cost_per_hour,
      margin_per_hour,
      margin_percent,
      total_margin,
      recruiter_commission,
      recruitment_lead_commission,
      sales_commission,
      sales_lead_commission,
      recruiter_commission_per_hour,
      recruitment_lead_commission_per_hour,
      sales_commission_per_hour,
      sales_lead_commission_per_hour,
      total_commission_per_hour,
      total_commission,
      unallocated_amount,
      total_split_percent
    };
  }, [watchedValues]);

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const totalSplitPercent = calculations.total_split_percent;
  const hasWarning = totalSplitPercent > 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Commission Calculator</h1>
        <p className="text-muted-foreground">Calculate commission splits and margins for new engagements</p>
      </div>

      {/* Engagement Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {isEditMode ? 'Edit Engagement' : 'Select Engagement'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="engagement-select">Select Existing Engagement</Label>
              <Combobox
                options={engagementOptions}
                value={selectedEngagement?.id || ''}
                onValueChange={handleEngagementSelect}
                placeholder="Search engagements..."
                emptyMessage={engagements.length === 0 ? "No engagements found" : "No matching engagements"}
              />
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleNewEngagement}
              className="whitespace-nowrap"
            >
              Create New Engagement
            </Button>
          </div>
          
          {isEditMode && selectedEngagement && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Editing:</strong> {selectedEngagement.consultant_name} - {selectedEngagement.client}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Engagement Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Engagement Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="consultant_name">Consultant Name *</Label>
                <Input
                  id="consultant_name"
                  value={watchedValues.consultant_name}
                  onChange={(e) => handleConsultantNameChange(e.target.value)}
                  placeholder="Enter consultant name"
                />
                {form.formState.errors.consultant_name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.consultant_name.message}
                  </p>
                )}
                {watchedValues.consultant_name && engagements.filter(eng => 
                  eng.consultant_name.toLowerCase() === watchedValues.consultant_name.toLowerCase()
                ).length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Auto-filled data from previous records
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="client">Client *</Label>
                <Input
                  id="client"
                  {...form.register('client')}
                  placeholder="Enter client name"
                  disabled={watchedValues.consultant_name && engagements.filter(eng => 
                    eng.consultant_name.toLowerCase() === watchedValues.consultant_name.toLowerCase()
                  ).length > 0}
                />
                {form.formState.errors.client && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.client.message}
                  </p>
                )}
                {watchedValues.consultant_name && engagements.filter(eng => 
                  eng.consultant_name.toLowerCase() === watchedValues.consultant_name.toLowerCase()
                ).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-filled from previous records
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="end_client">End Client (Optional)</Label>
                <Input
                  id="end_client"
                  {...form.register('end_client')}
                  placeholder="Enter end client name"
                />
              </div>

              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...form.register('start_date')}
                />
                {form.formState.errors.start_date && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.start_date.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...form.register('end_date')}
                  placeholder="Enter end date"
                />
                {form.formState.errors.end_date && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.end_date.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Commission Duration *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="commission_start_monthyear" className="text-xs">Start Month/Year</Label>
                    <Select
                      value={watchedValues.commission_start_monthyear || ''}
                      onValueChange={(value) => form.setValue('commission_start_monthyear', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select start month/year" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateMonthYearOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="commission_end_monthyear" className="text-xs">End Month/Year</Label>
                    <Select
                      value={watchedValues.commission_end_monthyear || ''}
                      onValueChange={(value) => form.setValue('commission_end_monthyear', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select end month/year" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateMonthYearOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.formState.errors.commission_start_monthyear && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.commission_start_monthyear.message}
                  </p>
                )}
                {form.formState.errors.commission_end_monthyear && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.commission_end_monthyear.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Commission calculations will run from start month/year to end month/year
                </p>
              </div>
              
              <div>
                <Label htmlFor="commission_cycle">Commission Cycle *</Label>
                <Select
                  value={watchedValues.commission_cycle}
                  onValueChange={handleCommissionCycleChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="hours">Billable Hours *</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.1"
                  {...form.register('hours', { valueAsNumber: true })}
                  placeholder="Enter billable hours"
                />
                {form.formState.errors.hours && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.hours.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="bill_rate">Bill Rate ($/hr) *</Label>
                <Input
                  id="bill_rate"
                  type="number"
                  step="0.01"
                  {...form.register('bill_rate', { valueAsNumber: true })}
                  placeholder="Enter bill rate"
                />
                {form.formState.errors.bill_rate && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.bill_rate.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="pay_rate">Pay Rate ($/hr) *</Label>
                <Input
                  id="pay_rate"
                  type="number"
                  step="0.01"
                  {...form.register('pay_rate', { valueAsNumber: true })}
                  placeholder="Enter pay rate"
                />
                {form.formState.errors.pay_rate && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.pay_rate.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="load_percent">Load (%) *</Label>
                <Input
                  id="load_percent"
                  type="number"
                  step="0.1"
                  {...form.register('load_percent', { valueAsNumber: true })}
                  placeholder="Enter load percentage (e.g., 30)"
                />
                {form.formState.errors.load_percent && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.load_percent.message}
                  </p>
                )}
              </div>

              {/* Real-time Calculations Preview */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">Quick Calculations</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost/hr:</span>
                    <span className="font-mono">{formatCurrency(calculations.total_cost_per_hour)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margin/hr:</span>
                    <span className={cn(
                      "font-mono",
                      calculations.margin_percent > 20 ? "text-green-600" : 
                      calculations.margin_percent > 10 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {formatCurrency(calculations.margin_per_hour)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margin %:</span>
                    <span className={cn(
                      "font-mono",
                      calculations.margin_percent > 20 ? "text-green-600" : 
                      calculations.margin_percent > 10 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {formatPercent(calculations.margin_percent)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total Margin:</span>
                    <span className="font-mono">{formatCurrency(calculations.total_margin)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Team Commission Splits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Commission Splits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {hasWarning && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Total split percentage ({totalSplitPercent.toFixed(2)}%) exceeds 100%. Please adjust the splits.
                  </AlertDescription>
                </Alert>
              )}

              {[
                { name: 'recruiter', label: 'Recruiter' },
                { name: 'recruitment_lead', label: 'Recruitment Lead' },
                { name: 'sales', label: 'Sales' },
                { name: 'sales_lead', label: 'Sales Lead' }
              ].map((role) => (
                <div key={role.name} className="space-y-2">
                  <Label>{role.label}</Label>
                  <div className="grid grid-cols-7 gap-2">
                    <div className="col-span-5">
                      <Combobox
                        options={employeeOptions}
                        value={form.watch(`${role.name}_name` as any)}
                        onValueChange={(value) => form.setValue(`${role.name}_name` as any, value)}
                        placeholder={`Select ${role.label}...`}
                        emptyMessage={isLoadingEmployees ? "Loading..." : "No employees found"}
                        className={cn(
                          hasWarning && "border-amber-300 focus:border-amber-500"
                        )}
                      />
                    </div>
                    <div className="col-span-2 relative">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="%"
                        {...form.register(`${role.name}_split_percent` as any, { valueAsNumber: true })}
                        className={cn(
                          "pr-8",
                          hasWarning && "border-amber-300 focus:border-amber-500"
                        )}
                      />
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Commission Summary */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">Commission Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Commission:</span>
                    <span className="font-mono font-semibold text-amber-600">
                      {formatCurrency(calculations.total_commission)}
                    </span>
                  </div>
                  
                  {/* Hourly Commissions by Role */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium mb-1">Hourly Commission by Role:</div>
                    {watchedValues.recruiter_name && calculations.recruiter_commission_per_hour > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Recruiter ({watchedValues.recruiter_name}):</span>
                        <span className="font-mono text-blue-600">
                          {formatCurrency(calculations.recruiter_commission_per_hour)}/hr
                        </span>
                      </div>
                    )}
                    {watchedValues.recruitment_lead_name && calculations.recruitment_lead_commission_per_hour > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Recruitment Lead ({watchedValues.recruitment_lead_name}):</span>
                        <span className="font-mono text-blue-600">
                          {formatCurrency(calculations.recruitment_lead_commission_per_hour)}/hr
                        </span>
                      </div>
                    )}
                    {watchedValues.sales_name && calculations.sales_commission_per_hour > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Sales ({watchedValues.sales_name}):</span>
                        <span className="font-mono text-blue-600">
                          {formatCurrency(calculations.sales_commission_per_hour)}/hr
                        </span>
                      </div>
                    )}
                    {watchedValues.sales_lead_name && calculations.sales_lead_commission_per_hour > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Sales Lead ({watchedValues.sales_lead_name}):</span>
                        <span className="font-mono text-blue-600">
                          {formatCurrency(calculations.sales_lead_commission_per_hour)}/hr
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {calculations.unallocated_amount > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Unallocated:</span>
                      <span className="font-mono">{formatCurrency(calculations.unallocated_amount)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? 'Hide' : 'Show'} Full Preview
        </Button>
        
        {/* Delete button - only show in edit mode */}
        {isEditMode && selectedEngagement && (
          <Button 
            type="button" 
            variant="destructive"
            onClick={handleDeleteEngagement}
            disabled={isSaving}
          >
            Delete Engagement
          </Button>
        )}
        
        <Button 
          type="submit" 
          disabled={isSaving || hasWarning}
          onClick={form.handleSubmit(onSubmit)}
        >
          {isSaving ? 'Saving...' : (isEditMode ? 'Update Engagement' : 'Create Engagement')}
        </Button>
      </div>

      {/* Full Calculations Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Full Calculations Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Cost Calculations */}
              <div className="space-y-2">
                <h4 className="font-semibold">Cost Analysis</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Cost/hr:</span>
                    <span className="ml-2 font-mono">{formatCurrency(calculations.total_cost_per_hour)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin/hr:</span>
                    <span className={cn(
                      "ml-2 font-mono",
                      calculations.margin_percent > 20 ? "text-green-600" : 
                      calculations.margin_percent > 10 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {formatCurrency(calculations.margin_per_hour)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin %:</span>
                    <span className={cn(
                      "ml-2 font-mono",
                      calculations.margin_percent > 20 ? "text-green-600" : 
                      calculations.margin_percent > 10 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {formatPercent(calculations.margin_percent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Margin:</span>
                    <span className="ml-2 font-mono font-semibold">{formatCurrency(calculations.total_margin)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Commission Breakdown */}
              <div className="space-y-2">
                <h4 className="font-semibold">Commission Breakdown</h4>
                <div className="space-y-2">
                  {watchedValues.recruiter_name && calculations.recruiter_commission > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{watchedValues.recruiter_name} ({watchedValues.recruiter_split_percent}%):</span>
                      <span className="font-mono">{formatCurrency(calculations.recruiter_commission)}</span>
                    </div>
                  )}
                  {watchedValues.recruitment_lead_name && calculations.recruitment_lead_commission > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{watchedValues.recruitment_lead_name} ({watchedValues.recruitment_lead_split_percent}%):</span>
                      <span className="font-mono">{formatCurrency(calculations.recruitment_lead_commission)}</span>
                    </div>
                  )}
                  {watchedValues.sales_name && calculations.sales_commission > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{watchedValues.sales_name} ({watchedValues.sales_split_percent}%):</span>
                      <span className="font-mono">{formatCurrency(calculations.sales_commission)}</span>
                    </div>
                  )}
                  {watchedValues.sales_lead_name && calculations.sales_lead_commission > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{watchedValues.sales_lead_name} ({watchedValues.sales_lead_split_percent}%):</span>
                      <span className="font-mono">{formatCurrency(calculations.sales_lead_commission)}</span>
                    </div>
                  )}
                  {calculations.unallocated_amount > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>Unallocated ({(100 - totalSplitPercent).toFixed(2)}%):</span>
                      <span className="font-mono">{formatCurrency(calculations.unallocated_amount)}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Total Commission */}
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Commission:</span>
                  <span className="text-xl font-bold font-mono text-amber-700">
                    {formatCurrency(calculations.total_commission)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CommissionCalculator;
