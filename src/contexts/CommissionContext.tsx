import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import type { 
  CommissionEngagement, 
  CommissionKPICards, 
  CommissionSplitByPerson, 
  CommissionSplitByEngagement,
  CommissionReportByConsultant,
  CommissionReportByClient,
  CommissionReportByCycle,
  CommissionTeamEarnings,
  CommissionFormData
} from '@/types/commission';

interface CommissionContextType {
  // Data
  engagements: CommissionEngagement[];
  employees: Array<{ id: string; full_name: string; email: string }>;
  kpiCards: CommissionKPICards;
  splitsByPerson: CommissionSplitByPerson[];
  splitsByEngagement: CommissionSplitByEngagement[];
  reportByConsultant: CommissionReportByConsultant[];
  reportByClient: CommissionReportByClient[];
  reportByCycle: CommissionReportByCycle[];
  teamEarnings: CommissionTeamEarnings[];
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isLoadingEmployees: boolean;
  
  // Actions
  fetchEngagements: () => Promise<void>;
  fetchEmployees: () => Promise<void>;
  createEngagement: (data: CommissionFormData) => Promise<void>;
  updateEngagement: (id: string, data: Partial<CommissionFormData>) => Promise<void>;
  deleteEngagement: (id: string) => Promise<void>;
  exportToCSV: () => void;
  exportToExcel: (type: 'engagements' | 'splits') => void;
}

const CommissionContext = createContext<CommissionContextType | undefined>(undefined);

export const useCommission = () => {
  const context = useContext(CommissionContext);
  if (!context) {
    throw new Error('useCommission must be used within a CommissionProvider');
  }
  return context;
};

export const CommissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [engagements, setEngagements] = useState<CommissionEngagement[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [kpiCards, setKpiCards] = useState<CommissionKPICards>({
    total_engagements: 0,
    average_bill_rate: 0,
    total_margin: 0,
    total_commission: 0
  });
  const [splitsByPerson, setSplitsByPerson] = useState<CommissionSplitByPerson[]>([]);
  const [splitsByEngagement, setSplitsByEngagement] = useState<CommissionSplitByEngagement[]>([]);
  const [reportByConsultant, setReportByConsultant] = useState<CommissionReportByConsultant[]>([]);
  const [reportByClient, setReportByClient] = useState<CommissionReportByClient[]>([]);
  const [reportByCycle, setReportByCycle] = useState<CommissionReportByCycle[]>([]);
  const [teamEarnings, setTeamEarnings] = useState<CommissionTeamEarnings[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Calculate KPIs from engagements
  const calculateKPIs = useCallback((engagementData: CommissionEngagement[]) => {
    if (engagementData.length === 0) {
      setKpiCards({
        total_engagements: 0,
        average_bill_rate: 0,
        total_margin: 0,
        total_commission: 0
      });
      return;
    }

    const totalEngagements = engagementData.length;
    const totalBillRate = engagementData.reduce((sum, e) => sum + (e.bill_rate * e.hours), 0);
    const totalHours = engagementData.reduce((sum, e) => sum + e.hours, 0);
    const totalMargin = engagementData.reduce((sum, e) => sum + e.total_margin, 0);
    const totalCommission = engagementData.reduce((sum, e) => sum + e.total_commission, 0);

    setKpiCards({
      total_engagements: totalEngagements,
      average_bill_rate: totalHours > 0 ? totalBillRate / totalHours : 0,
      total_margin: totalMargin,
      total_commission: totalCommission
    });
  }, []);

  // Calculate splits by person
  const calculateSplitsByPerson = useCallback((engagementData: CommissionEngagement[]) => {
    const personMap = new Map<string, CommissionSplitByPerson>();

    engagementData.forEach(engagement => {
      const teamMembers = [
        { name: engagement.recruiter_name, commission: engagement.recruiter_commission },
        { name: engagement.recruitment_lead_name, commission: engagement.recruitment_lead_commission },
        { name: engagement.sales_name, commission: engagement.sales_commission },
        { name: engagement.sales_lead_name, commission: engagement.sales_lead_commission }
      ];

      teamMembers.forEach(member => {
        if (member.name && member.commission > 0) {
          const existing = personMap.get(member.name) || {
            name: member.name,
            roles: [],
            engagement_count: 0,
            total_commission: 0
          };
          
          existing.total_commission += member.commission;
          existing.engagement_count += 1;
          
          if (!existing.roles.includes('Recruiter') && member.name === engagement.recruiter_name) {
            existing.roles.push('Recruiter');
          }
          if (!existing.roles.includes('Recruitment Lead') && member.name === engagement.recruitment_lead_name) {
            existing.roles.push('Recruitment Lead');
          }
          if (!existing.roles.includes('Sales') && member.name === engagement.sales_name) {
            existing.roles.push('Sales');
          }
          if (!existing.roles.includes('Sales Lead') && member.name === engagement.sales_lead_name) {
            existing.roles.push('Sales Lead');
          }
          
          personMap.set(member.name, existing);
        }
      });
    });

    setSplitsByPerson(Array.from(personMap.values()));
  }, []);

  // Calculate splits by engagement
  const calculateSplitsByEngagement = useCallback((engagementData: CommissionEngagement[]) => {
    const result: CommissionSplitByEngagement[] = engagementData.map(engagement => {
      const teamMembers = [
        { name: engagement.recruiter_name, split_percent: engagement.recruiter_split_percent, commission_amount: engagement.recruiter_commission },
        { name: engagement.recruitment_lead_name, split_percent: engagement.recruitment_lead_split_percent, commission_amount: engagement.recruitment_lead_commission },
        { name: engagement.sales_name, split_percent: engagement.sales_split_percent, commission_amount: engagement.sales_commission },
        { name: engagement.sales_lead_name, split_percent: engagement.sales_lead_split_percent, commission_amount: engagement.sales_lead_commission }
      ].filter(member => member.name && member.split_percent > 0);

      return {
        engagement_id: engagement.id,
        consultant_name: engagement.consultant_name,
        client: engagement.client,
        commission_cycle: engagement.commission_cycle,
        team_members: teamMembers,
        unallocated_balance: engagement.unallocated_amount
      };
    });

    setSplitsByEngagement(result);
  }, []);

  // Calculate reports
  const calculateReports = useCallback((engagementData: CommissionEngagement[]) => {
    // By Consultant
    const consultantMap = new Map<string, CommissionReportByConsultant>();
    engagementData.forEach(engagement => {
      const existing = consultantMap.get(engagement.consultant_name) || {
        consultant_name: engagement.consultant_name,
        engagement_count: 0,
        total_commission: 0,
        avg_margin_percent: 0
      };
      
      existing.engagement_count += 1;
      existing.total_commission += engagement.total_commission;
      existing.avg_margin_percent = (existing.avg_margin_percent * (existing.engagement_count - 1) + engagement.margin_percent) / existing.engagement_count;
      
      consultantMap.set(engagement.consultant_name, existing);
    });
    setReportByConsultant(Array.from(consultantMap.values()));

    // By Client
    const clientMap = new Map<string, CommissionReportByClient>();
    engagementData.forEach(engagement => {
      const existing = clientMap.get(engagement.client) || {
        client: engagement.client,
        engagement_count: 0,
        total_commission: 0,
        avg_bill_rate: 0
      };
      
      existing.engagement_count += 1;
      existing.total_commission += engagement.total_commission;
      existing.avg_bill_rate = (existing.avg_bill_rate * (existing.engagement_count - 1) + engagement.bill_rate) / existing.engagement_count;
      
      clientMap.set(engagement.client, existing);
    });
    setReportByClient(Array.from(clientMap.values()));

    // By Cycle
    const cycleMap = new Map<string, CommissionReportByCycle>();
    engagementData.forEach(engagement => {
      const existing = cycleMap.get(engagement.commission_cycle) || {
        commission_cycle: engagement.commission_cycle,
        engagement_count: 0,
        total_commission: 0
      };
      
      existing.engagement_count += 1;
      existing.total_commission += engagement.total_commission;
      
      cycleMap.set(engagement.commission_cycle, existing);
    });
    setReportByCycle(Array.from(cycleMap.values()));

    // Team Earnings - calculate directly from engagement data
    const personMap = new Map<string, { name: string; roles: string[]; engagement_count: number; total_commission: number }>();

    engagementData.forEach(engagement => {
      const teamMembers = [
        { name: engagement.recruiter_name, commission: engagement.recruiter_commission },
        { name: engagement.recruitment_lead_name, commission: engagement.recruitment_lead_commission },
        { name: engagement.sales_name, commission: engagement.sales_commission },
        { name: engagement.sales_lead_name, commission: engagement.sales_lead_commission }
      ];

      teamMembers.forEach(member => {
        if (member.name && member.commission > 0) {
          const existing = personMap.get(member.name) || {
            name: member.name,
            roles: [],
            engagement_count: 0,
            total_commission: 0
          };
          
          existing.total_commission += member.commission;
          existing.engagement_count += 1;
          
          if (!existing.roles.includes('Recruiter') && member.name === engagement.recruiter_name) {
            existing.roles.push('Recruiter');
          }
          if (!existing.roles.includes('Recruitment Lead') && member.name === engagement.recruitment_lead_name) {
            existing.roles.push('Recruitment Lead');
          }
          if (!existing.roles.includes('Sales') && member.name === engagement.sales_name) {
            existing.roles.push('Sales');
          }
          if (!existing.roles.includes('Sales Lead') && member.name === engagement.sales_lead_name) {
            existing.roles.push('Sales Lead');
          }
          
          personMap.set(member.name, existing);
        }
      });
    });

    const earnings = Array.from(personMap.values()).map(person => ({
      name: person.name,
      roles: person.roles,
      engagement_count: person.engagement_count,
      total_earned: person.total_commission
    }));
    setTeamEarnings(earnings);
  }, []); // Remove splitsByPerson dependency

  // Fetch engagements
  const fetchEngagements = useCallback(async () => {
    const company = currentCompany; // Capture current value
    if (!company) {
      setEngagements([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('commission_engagements')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setEngagements(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching engagements",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany]);

  // Fetch active employees
  const fetchEmployees = useCallback(async () => {
    const company = currentCompany; // Capture current value
    if (!company) {
      setEmployees([]);
      setIsLoadingEmployees(false);
      return;
    }
    
    setIsLoadingEmployees(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, role')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .in('role', ['employee', 'reporting_manager', 'admin', 'super_admin'])
        .order('name');

      if (error) throw error;
      
      // Transform to match expected format
      const transformedEmployees = (data || []).map(emp => ({
        id: emp.id,
        full_name: emp.name,
        email: emp.email
      }));
      
      setEmployees(transformedEmployees);
    } catch (error: any) {
      toast({
        title: "Error fetching employees",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingEmployees(false);
    }
  }, []); // Remove currentCompany dependency

  // Create engagement
  const createEngagement = useCallback(async (data: CommissionFormData) => {
    const company = currentCompany; // Capture current value
    if (!company) {
      throw new Error('No company selected');
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('commission_engagements')
        .insert([{
          ...data,
          company_id: company.id,
          created_by: user?.id
        }]);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Engagement created successfully"
      });
      
      await fetchEngagements();
    } catch (error: any) {
      toast({
        title: "Error creating engagement",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentCompany, user, fetchEngagements]);

  // Update engagement
  const updateEngagement = useCallback(async (id: string, data: Partial<CommissionFormData>) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('commission_engagements')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Engagement updated successfully"
      });
      
      await fetchEngagements();
    } catch (error: any) {
      toast({
        title: "Error updating engagement",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [fetchEngagements]);

  // Delete engagement
  const deleteEngagement = useCallback(async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('commission_engagements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Engagement deleted successfully"
      });
      
      await fetchEngagements();
    } catch (error: any) {
      toast({
        title: "Error deleting engagement",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [fetchEngagements]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = [
      'Consultant', 'Client', 'End Client', 'Start Date', 'Bill Rate', 'Pay Rate', 'Load%', 
      'Total Cost', 'Margin', 'Margin%', 'Hours', 'Total Margin', 'Total Commission', 
      'Cycle', 'Recruiter', 'Rec%', 'Rec Comm', 'Rec Lead', 'RecLead%', 'RecLead Comm', 
      'Sales', 'Sales%', 'Sales Comm', 'Sales Lead', 'SalesLead%', 'SalesLead Comm'
    ];
    
    const csvContent = [
      headers.join(','),
      ...engagements.map(e => [
        e.consultant_name,
        e.client,
        e.end_client || '',
        e.start_date,
        e.bill_rate,
        e.pay_rate,
        e.load_percent,
        e.total_cost_per_hour,
        e.margin_per_hour,
        e.margin_percent,
        e.hours,
        e.total_margin,
        e.total_commission,
        e.commission_cycle,
        e.recruiter_name || '',
        e.recruiter_split_percent,
        e.recruiter_commission,
        e.recruitment_lead_name || '',
        e.recruitment_lead_split_percent,
        e.recruitment_lead_commission,
        e.sales_name || '',
        e.sales_split_percent,
        e.sales_commission,
        e.sales_lead_name || '',
        e.sales_lead_split_percent,
        e.sales_lead_commission
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission_engagements_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [engagements]);

  // Export to Excel
  const exportToExcel = useCallback(async (type: 'engagements' | 'splits') => {
    // This would use the xlsx library - for now, we'll implement a basic version
    if (type === 'engagements') {
      // Similar to CSV but as Excel format
      exportToCSV(); // Fallback to CSV for now
    } else {
      // Export splits with multiple sheets
      toast({
        title: "Export Feature",
        description: "Excel export will be implemented with SheetJS library"
      });
    }
  }, [exportToCSV]);

  // Update calculations when engagements change
  useEffect(() => {
    calculateKPIs(engagements);
    calculateSplitsByPerson(engagements);
    calculateSplitsByEngagement(engagements);
    calculateReports(engagements);
  }, [engagements]); // Only depend on engagements data

  // Load data on mount and when company changes
  useEffect(() => {
    fetchEngagements();
    fetchEmployees();
  }, [currentCompany, fetchEngagements, fetchEmployees]); // Trigger when company changes

  const value: CommissionContextType = {
    engagements,
    employees,
    kpiCards,
    splitsByPerson,
    splitsByEngagement,
    reportByConsultant,
    reportByClient,
    reportByCycle,
    teamEarnings,
    isLoading,
    isSaving,
    isLoadingEmployees,
    fetchEngagements,
    fetchEmployees,
    createEngagement,
    updateEngagement,
    deleteEngagement,
    exportToCSV,
    exportToExcel
  };

  return (
    <CommissionContext.Provider value={value}>
      {children}
    </CommissionContext.Provider>
  );
};
