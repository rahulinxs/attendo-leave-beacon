-- Migration: Create performance_reports table for performance reporting

CREATE TABLE IF NOT EXISTS performance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id),
    user_id UUID REFERENCES employees(id),
    monster INTEGER DEFAULT 0,
    dice INTEGER DEFAULT 0,
    linkedin_profiles_viewed INTEGER DEFAULT 0,
    linkedin_inmails_sent INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    total_call_duration INTERVAL DEFAULT '0',
    total_submissions INTEGER DEFAULT 0,
    total_interviews INTEGER DEFAULT 0,
    offers INTEGER DEFAULT 0,
    starts INTEGER DEFAULT 0,
    placed INTEGER DEFAULT 0,
    offered INTEGER DEFAULT 0,
    report_date DATE NOT NULL,
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_performance_reports_team_id ON performance_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_performance_reports_user_id ON performance_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_reports_company_id ON performance_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_reports_report_date ON performance_reports(report_date);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_performance_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_performance_reports_updated_at
    BEFORE UPDATE ON performance_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_reports_updated_at();

-- Enable RLS
ALTER TABLE performance_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and reporting managers can view all performance reports in their company
CREATE POLICY "Admins and managers can view company performance reports" ON performance_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND company_id = performance_reports.company_id
            AND role IN ('admin', 'super_admin', 'reporting_manager')
        )
    );

-- Policy: Only admins and reporting managers can insert/update/delete
CREATE POLICY "Admins and managers can modify company performance reports" ON performance_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND company_id = performance_reports.company_id
            AND role IN ('admin', 'super_admin', 'reporting_manager')
        )
    ); 