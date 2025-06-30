-- Migration: Add employee_profiles and employee_documents tables

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
    id_card_issued boolean,
    visiting_card_issued boolean,
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_profiles_employee_id ON employee_profiles(employee_id);

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

-- Optionally, add indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON employee_documents(employee_id); 