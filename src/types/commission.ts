export interface CommissionEngagement {
  id: string;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Engagement Details
  consultant_name: string;
  client: string;
  end_client?: string;
  start_date: string;
  commission_cycle: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
  hours: number;
  
  // Financial Inputs
  bill_rate: number;
  pay_rate: number;
  load_percent: number;
  
  // Team Members
  recruiter_name?: string;
  recruiter_split_percent: number;
  recruitment_lead_name?: string;
  recruitment_lead_split_percent: number;
  sales_name?: string;
  sales_split_percent: number;
  sales_lead_name?: string;
  sales_lead_split_percent: number;
  
  // Calculated Fields
  total_cost_per_hour: number;
  margin_per_hour: number;
  margin_percent: number;
  total_margin: number;
  recruiter_commission: number;
  recruitment_lead_commission: number;
  sales_commission: number;
  sales_lead_commission: number;
  total_commission: number;
  unallocated_amount: number;
}

export interface CommissionKPICards {
  total_engagements: number;
  average_bill_rate: number;
  total_margin: number;
  total_commission: number;
}

export interface CommissionSplitByPerson {
  name: string;
  roles: string[];
  engagement_count: number;
  total_commission: number;
}

export interface CommissionSplitByEngagement {
  engagement_id: string;
  consultant_name: string;
  client: string;
  commission_cycle: string;
  team_members: {
    name: string;
    split_percent: number;
    commission_amount: number;
  }[];
  unallocated_balance: number;
}

export interface CommissionReportByConsultant {
  consultant_name: string;
  engagement_count: number;
  total_commission: number;
  avg_margin_percent: number;
}

export interface CommissionReportByClient {
  client: string;
  engagement_count: number;
  total_commission: number;
  avg_bill_rate: number;
}

export interface CommissionReportByCycle {
  commission_cycle: string;
  engagement_count: number;
  total_commission: number;
}

export interface CommissionTeamEarnings {
  name: string;
  roles: string[];
  engagement_count: number;
  total_earned: number;
}

export interface CommissionFormData {
  // System Fields
  company_id: string;
  created_by?: string;
  
  // Engagement Details
  consultant_name: string;
  client: string;
  end_client?: string;
  start_date: string;
  commission_cycle: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
  hours: number;
  
  // Financial Inputs
  bill_rate: number;
  pay_rate: number;
  load_percent: number;
  
  // Team Members
  recruiter_name?: string;
  recruiter_split_percent: number;
  recruitment_lead_name?: string;
  recruitment_lead_split_percent: number;
  sales_name?: string;
  sales_split_percent: number;
  sales_lead_name?: string;
  sales_lead_split_percent: number;
}
