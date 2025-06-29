@echo off
echo ========================================
echo Running Team Fix Migration
echo ========================================
echo.
echo This script will copy the team fix migration SQL to your clipboard.
echo Please run this SQL in your Supabase SQL Editor.
echo.
echo Migration file: supabase/migrations/019_add_team_id_to_profiles.sql
echo.
pause

type "supabase\migrations\019_add_team_id_to_profiles.sql" | clip

echo.
echo ========================================
echo SQL copied to clipboard!
echo ========================================
echo.
echo Next steps:
echo 1. Go to your Supabase Dashboard
echo 2. Navigate to SQL Editor
echo 3. Paste the SQL (Ctrl+V)
echo 4. Click "Run" to execute the migration
echo.
echo This will:
echo - Add team_id column to profiles table
echo - Add reporting_manager_id column to profiles table
echo - Add company_id column to profiles table
echo - Establish foreign key relationships
echo - Update existing profiles with team assignments
echo - Update RLS policies for team-based access
echo.
echo After running this migration, the team relationship errors should be resolved.
echo.
pause 