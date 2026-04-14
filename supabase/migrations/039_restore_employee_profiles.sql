-- =========================================================
-- CRITICAL FIX: RESTORE EMPLOYEE_PROFILES TABLE
-- =========================================================

-- I accidentally dropped the real employee_profiles table that contained
-- important employee data. This migration restores it.

-- =========================================================
-- RESTORE EMPLOYEE_PROFILES TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS employee_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    -- Personal Info
    date_of_birth date,
    gender text,
    blood_group text,
    marital_status text,
    marriage_anniversary date,
    -- Contact Info
    personal_email text,
    phone_number text,
    alternate_phone_number text,
    -- Address Info
    current_address text,
    permanent_address text,
    house_type text,
    residing_since date,
    living_in_city_since date,
    -- Social Profiles
    social_profiles jsonb, -- e.g. {"linkedin": "...", "facebook": "...", "twitter": "..."}
    -- Stationery
    id_card_issued boolean DEFAULT false,
    visiting_card_issued boolean DEFAULT false,
    -- Work Info
    employee_code text,
    date_of_joining date,
    probation_period int,
    employee_type text,
    work_location text,
    probation_status text,
    work_experience_years int,
    designation text,
    job_title text,
    department text,
    sub_department text,
    -- Work History, Education, Family, Emergency Contacts as JSONB
    work_history jsonb,      -- [{department, designation, from, to}]
    education_history jsonb, -- [{degree, institution, year_of_completion}]
    family_members jsonb,    -- [{name, relationship, date_of_birth, is_dependent}]
    emergency_contacts jsonb -- [{name, relationship, phone_number}]
);

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_profiles_employee_id ON employee_profiles(employee_id);

-- =========================================================
-- RESTORE EMPLOYEE_DOCUMENTS TABLE (just in case)
-- =========================================================

CREATE TABLE IF NOT EXISTS employee_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type text NOT NULL,
    file_url text NOT NULL,
    uploaded_by uuid REFERENCES employees(id),
    uploaded_at timestamptz DEFAULT now(),
    verification_status text,
    meta jsonb
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON employee_documents(employee_id);

-- =========================================================
-- AUTO-POPULATE BASIC PROFILE DATA FROM EMPLOYEES TABLE
-- =========================================================

-- Create basic profile records for all existing employees
-- This will at least give us a starting point for recovery
INSERT INTO employee_profiles (
    employee_id,
    date_of_joining,
    designation,
    department,
    employee_code,
    work_location
)
SELECT 
    e.id,
    e.hire_date as date_of_joining,
    e.position as designation,
    e.department as department,
    'EMP-' || LPAD((ROW_NUMBER() OVER (ORDER BY e.created_at))::text, 4, '0') as employee_code,
    'Main Office' as work_location
FROM employees e
LEFT JOIN employee_profiles ep ON e.id = ep.employee_id
WHERE ep.employee_id IS NULL
AND e.is_active = true;

-- =========================================================
-- CREATE PROFILE COMPLETION TRACKING
-- =========================================================

-- Create a view to track which employees need to complete their profiles
CREATE OR REPLACE VIEW profile_completion_status AS
SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.email as employee_email,
    CASE 
        WHEN ep.employee_id IS NULL THEN 'NOT_STARTED'
        WHEN (
            ep.phone_number IS NULL OR 
            ep.current_address IS NULL OR 
            ep.emergency_contacts IS NULL
        ) THEN 'INCOMPLETE'
        ELSE 'COMPLETE'
    END as completion_status,
    CASE 
        WHEN ep.employee_id IS NULL THEN 0
        WHEN (
            ep.phone_number IS NULL OR 
            ep.current_address IS NULL OR 
            ep.emergency_contacts IS NULL
        ) THEN 50
        ELSE 100
    END as completion_percentage,
    ep.updated_at as last_updated
FROM employees e
LEFT JOIN employee_profiles ep ON e.id = ep.employee_id
WHERE e.is_active = true
ORDER BY completion_percentage ASC, e.name ASC;

-- =========================================================
-- CRITICAL DATA LOSS RECOVERY PLAN
-- =========================================================

-- ⚠️ DATA LOSS CONFIRMED:
-- The original employee_profiles table was accidentally dropped in migration 038.
-- No backup exists. All employee profile data has been lost.

-- 🚨 IMMEDIATE ACTIONS REQUIRED:
-- 1. Run this migration to restore table structure
-- 2. Notify all employees immediately about data loss
-- 3. Set deadline for profile re-entry (recommend 7 days)
-- 4. Monitor completion using profile_completion_status view
-- 5. Follow up with employees who haven't completed profiles

-- 📧 NOTIFICATION TEMPLATE:
-- Subject: URGENT: Employee Profile Data Loss - Action Required
-- 
-- Dear Employees,
-- 
-- Due to a technical issue, all employee profile information has been lost.
-- This includes personal details, contact information, addresses, emergency contacts, etc.
-- 
-- ACTION REQUIRED BY [DATE]:
-- Please log into AttendEdge and complete your profile information immediately.
-- 
-- Critical information needed:
-- - Phone number and personal email
-- - Current and permanent address
-- - Emergency contact information
-- - Personal details (date of birth, etc.)
-- 
-- Your cooperation is essential for HR operations and emergency communications.
-- 
-- Thank you for your understanding.

-- 🔍 MONITORING:
-- Use this query to track progress:
-- SELECT * FROM profile_completion_status WHERE completion_status != 'COMPLETE';

-- 📞 ESCALATION:
-- If completion rate is below 80% after 3 days, send reminders
-- If completion rate is below 60% after 5 days, involve managers
