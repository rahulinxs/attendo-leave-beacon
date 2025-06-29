-- Migration: Add company_id to employees for multi-tenancy
ALTER TABLE employees ADD COLUMN company_id UUID;

-- Set company_id for all existing employees to NYTP
UPDATE employees SET company_id = (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1);

-- Set NOT NULL constraint (after populating existing rows)
ALTER TABLE employees ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE employees ADD CONSTRAINT employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE; 