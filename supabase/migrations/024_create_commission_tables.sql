-- Migration: Create Commission Tables
-- This migration creates tables for the Commission Calculator module

-- Create commission_engagements table
CREATE TABLE IF NOT EXISTS commission_engagements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Engagement Details
  consultant_name TEXT NOT NULL,
  client TEXT NOT NULL,
  end_client TEXT,
  start_date DATE NOT NULL,
  commission_cycle TEXT NOT NULL CHECK (commission_cycle IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual')),
  hours DECIMAL(10,2) NOT NULL CHECK (hours >= 0),
  
  -- Financial Inputs
  bill_rate DECIMAL(10,2) NOT NULL CHECK (bill_rate >= 0),
  pay_rate DECIMAL(10,2) NOT NULL CHECK (pay_rate >= 0),
  load_percent DECIMAL(5,2) NOT NULL CHECK (load_percent >= 0),
  
  -- Team Members
  recruiter_name TEXT,
  recruiter_split_percent DECIMAL(5,2) DEFAULT 0 CHECK (recruiter_split_percent >= 0),
  recruitment_lead_name TEXT,
  recruitment_lead_split_percent DECIMAL(5,2) DEFAULT 0 CHECK (recruitment_lead_split_percent >= 0),
  sales_name TEXT,
  sales_split_percent DECIMAL(5,2) DEFAULT 0 CHECK (sales_split_percent >= 0),
  sales_lead_name TEXT,
  sales_lead_split_percent DECIMAL(5,2) DEFAULT 0 CHECK (sales_lead_split_percent >= 0),
  
  -- Calculated Fields (stored for performance)
  total_cost_per_hour DECIMAL(10,2),
  margin_per_hour DECIMAL(10,2),
  margin_percent DECIMAL(5,2),
  total_margin DECIMAL(10,2),
  recruiter_commission DECIMAL(10,2) DEFAULT 0,
  recruitment_lead_commission DECIMAL(10,2) DEFAULT 0,
  sales_commission DECIMAL(10,2) DEFAULT 0,
  sales_lead_commission DECIMAL(10,2) DEFAULT 0,
  total_commission DECIMAL(10,2) DEFAULT 0,
  unallocated_amount DECIMAL(10,2) DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX idx_commission_engagements_company_id ON commission_engagements(company_id);
CREATE INDEX idx_commission_engagements_created_by ON commission_engagements(created_by);
CREATE INDEX idx_commission_engagements_consultant ON commission_engagements(consultant_name);
CREATE INDEX idx_commission_engagements_client ON commission_engagements(client);
CREATE INDEX idx_commission_engagements_cycle ON commission_engagements(commission_cycle);
CREATE INDEX idx_commission_engagements_start_date ON commission_engagements(start_date);

-- Enable RLS
ALTER TABLE commission_engagements ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their company's commission engagements" ON commission_engagements
  FOR SELECT USING (
    company_id = get_user_company_id() 
    OR is_super_admin()
  );

CREATE POLICY "Admins and Super Admins can insert commission engagements" ON commission_engagements
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id() AND is_admin_or_super_admin())
    OR is_super_admin()
  );

CREATE POLICY "Admins and Super Admins can update commission engagements" ON commission_engagements
  FOR UPDATE USING (
    (company_id = get_user_company_id() AND is_admin_or_super_admin())
    OR is_super_admin()
  );

CREATE POLICY "Admins and Super Admins can delete commission engagements" ON commission_engagements
  FOR DELETE USING (
    (company_id = get_user_company_id() AND is_admin_or_super_admin())
    OR is_super_admin()
  );

-- Create function to update calculated fields
CREATE OR REPLACE FUNCTION update_commission_calculations()
RETURNS TRIGGER AS $$
BEGIN
  -- Step 1: Total Cost/hr
  NEW.total_cost_per_hour := NEW.pay_rate * (1 + NEW.load_percent / 100);
  
  -- Step 2: Margin/hr
  NEW.margin_per_hour := NEW.bill_rate - NEW.total_cost_per_hour;
  
  -- Step 3: Total Margin
  NEW.total_margin := NEW.margin_per_hour * NEW.hours;
  
  -- Step 4: Individual commissions
  NEW.recruiter_commission := NEW.total_margin * NEW.recruiter_split_percent / 100;
  NEW.recruitment_lead_commission := NEW.total_margin * NEW.recruitment_lead_split_percent / 100;
  NEW.sales_commission := NEW.total_margin * NEW.sales_split_percent / 100;
  NEW.sales_lead_commission := NEW.total_margin * NEW.sales_lead_split_percent / 100;
  
  -- Step 5: Total Commission
  NEW.total_commission := NEW.recruiter_commission + NEW.recruitment_lead_commission + NEW.sales_commission + NEW.sales_lead_commission;
  
  -- Calculate margin percentage
  NEW.margin_percent := CASE 
    WHEN NEW.bill_rate > 0 THEN (NEW.margin_per_hour / NEW.bill_rate) * 100
    ELSE 0
  END;
  
  -- Calculate unallocated amount
  NEW.unallocated_amount := NEW.total_margin * (100 - (
    COALESCE(NEW.recruiter_split_percent, 0) + 
    COALESCE(NEW.recruitment_lead_split_percent, 0) + 
    COALESCE(NEW.sales_split_percent, 0) + 
    COALESCE(NEW.sales_lead_split_percent, 0)
  )) / 100;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate fields
CREATE TRIGGER trigger_update_commission_calculations
  BEFORE INSERT OR UPDATE ON commission_engagements
  FOR EACH ROW EXECUTE FUNCTION update_commission_calculations();

-- Add comment
COMMENT ON TABLE commission_engagements IS 'Commission engagements with calculated financial metrics and team splits';
