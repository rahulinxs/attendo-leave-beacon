-- Migration to revert role changes (if needed)
-- This migration reverses the changes made in 004_update_role_constraints.sql and 005_update_profiles_table.sql

-- Revert employees table role constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check 
  CHECK (role IN ('employee', 'admin'));

-- Revert profiles table role constraint  
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('employee', 'admin'));

-- Revert RLS policies to original state
DROP POLICY IF EXISTS "Employees can view own profile" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Super admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Employees can update own profile" ON employees;
DROP POLICY IF EXISTS "Admins can update employees" ON employees;
DROP POLICY IF EXISTS "Super admins can update employees" ON employees;

-- Recreate original policies
CREATE POLICY "Employees can view own profile" ON employees
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all employees" ON employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can update own profile" ON employees
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update employees" ON employees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Note: This migration will remove super_admin and reporting_manager roles
-- Any users with these roles will need to be updated to 'admin' or 'employee' first 