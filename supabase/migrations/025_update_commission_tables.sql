-- Migration: Update Commission Tables for New Form Structure
-- This migration updates the commission_engagements table to match the updated form

-- Add new fields for commission duration (as proper dates)
ALTER TABLE commission_engagements 
ADD COLUMN commission_start_date DATE,
ADD COLUMN commission_end_date DATE,
ADD COLUMN end_date DATE;

-- Add hourly commission fields
ALTER TABLE commission_engagements 
ADD COLUMN recruiter_commission_per_hour DECIMAL(10,2) DEFAULT 0,
ADD COLUMN recruitment_lead_commission_per_hour DECIMAL(10,2) DEFAULT 0,
ADD COLUMN sales_commission_per_hour DECIMAL(10,2) DEFAULT 0,
ADD COLUMN sales_lead_commission_per_hour DECIMAL(10,2) DEFAULT 0,
ADD COLUMN total_commission_per_hour DECIMAL(10,2) DEFAULT 0;

-- Update commission cycle constraint to only allow Monthly and Quarterly
ALTER TABLE commission_engagements 
DROP CONSTRAINT IF EXISTS commission_engagements_commission_cycle_check,
ADD CONSTRAINT commission_engagements_commission_cycle_check CHECK (
  commission_cycle IN ('Monthly', 'Quarterly')
);

-- Add constraints for new fields (simplified for basic validation)
-- Note: Complex validation will be handled in application layer

-- Update indexes for new fields
CREATE INDEX IF NOT EXISTS idx_commission_engagements_start_monthyear ON commission_engagements(commission_start_monthyear);
CREATE INDEX IF NOT EXISTS idx_commission_engagements_end_monthyear ON commission_engagements(commission_end_monthyear);
CREATE INDEX IF NOT EXISTS idx_commission_engagements_end_date ON commission_engagements(end_date);

-- Update the calculation trigger to include hourly commission calculations
CREATE OR REPLACE FUNCTION update_commission_calculations()
RETURNS TRIGGER AS $$
BEGIN
  -- Step 1: Total Cost/hr
  NEW.total_cost_per_hour := NEW.pay_rate * (1 + NEW.load_percent / 100);
  
  -- Step 2: Margin/hr
  NEW.margin_per_hour := NEW.bill_rate - NEW.total_cost_per_hour;
  
  -- Step 3: Total Margin
  NEW.total_margin := NEW.margin_per_hour * NEW.hours;
  
  -- Step 4: Individual commissions (total)
  NEW.recruiter_commission := NEW.total_margin * NEW.recruiter_split_percent / 100;
  NEW.recruitment_lead_commission := NEW.total_margin * NEW.recruitment_lead_split_percent / 100;
  NEW.sales_commission := NEW.total_margin * NEW.sales_split_percent / 100;
  NEW.sales_lead_commission := NEW.total_margin * NEW.sales_lead_split_percent / 100;
  
  -- Step 5: Individual commissions (hourly)
  NEW.recruiter_commission_per_hour := NEW.margin_per_hour * NEW.recruiter_split_percent / 100;
  NEW.recruitment_lead_commission_per_hour := NEW.margin_per_hour * NEW.recruitment_lead_split_percent / 100;
  NEW.sales_commission_per_hour := NEW.margin_per_hour * NEW.sales_split_percent / 100;
  NEW.sales_lead_commission_per_hour := NEW.margin_per_hour * NEW.sales_lead_split_percent / 100;
  
  -- Step 6: Total Commission
  NEW.total_commission := NEW.recruiter_commission + NEW.recruitment_lead_commission + NEW.sales_commission + NEW.sales_lead_commission;
  
  -- Step 7: Total hourly commission
  NEW.total_commission_per_hour := NEW.recruiter_commission_per_hour + NEW.recruitment_lead_commission_per_hour + 
                              NEW.sales_commission_per_hour + NEW.sales_lead_commission_per_hour;
  
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

-- Add comments for new fields
COMMENT ON COLUMN commission_engagements.commission_start_monthyear IS 'Commission duration start month and year (e.g., "June 2024")';
COMMENT ON COLUMN commission_engagements.commission_end_monthyear IS 'Commission duration end month and year (e.g., "August 2024")';
COMMENT ON COLUMN commission_engagements.end_date IS 'Engagement end date';
COMMENT ON COLUMN commission_engagements.recruiter_commission_per_hour IS 'Recruiter commission amount per hour';
COMMENT ON COLUMN commission_engagements.recruitment_lead_commission_per_hour IS 'Recruitment lead commission amount per hour';
COMMENT ON COLUMN commission_engagements.sales_commission_per_hour IS 'Sales commission amount per hour';
COMMENT ON COLUMN commission_engagements.sales_lead_commission_per_hour IS 'Sales lead commission amount per hour';
COMMENT ON COLUMN commission_engagements.total_commission_per_hour IS 'Total commission amount per hour across all roles';
