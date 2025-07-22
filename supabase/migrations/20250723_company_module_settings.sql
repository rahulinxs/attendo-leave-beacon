-- Migration: Create company_module_settings table for per-company feature toggles

CREATE TABLE IF NOT EXISTS company_module_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    performance_report_enabled BOOLEAN DEFAULT false,
    -- Add more feature flags as needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_company_module_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_module_settings_updated_at
    BEFORE UPDATE ON company_module_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_company_module_settings_updated_at(); 