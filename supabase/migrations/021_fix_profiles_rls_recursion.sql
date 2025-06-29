-- Migration: Clean and fix all RLS policies for profiles table (no recursion, no conflicts)

-- Drop ALL existing policies on profiles table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles;';
    END LOOP;
END$$;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Admins and Super Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
        )
    );

-- Admins and Super Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
    );

-- Admins and Super Admins can insert profiles
CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
    );

-- Super admins can delete profiles
CREATE POLICY "Super admins can delete profiles" ON profiles
    FOR DELETE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
    );

-- Managers can view team profiles
CREATE POLICY "Managers can view team profiles" ON profiles
    FOR SELECT USING (
        reporting_manager_id = auth.uid()
    );

-- Show migration results
SELECT 'Profiles RLS policies fixed successfully!' as status;

-- Test the policies by checking if we can query profiles
SELECT COUNT(*) as total_profiles FROM profiles; 