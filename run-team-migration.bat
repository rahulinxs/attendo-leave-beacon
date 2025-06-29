@echo off
echo ========================================
echo Running Team Structure Migration
echo ========================================
echo.
echo This script will copy the team structure migration SQL to your clipboard.
echo Please run this SQL in your Supabase SQL Editor.
echo.
echo Migration file: supabase/migrations/011_create_team_structure.sql
echo.
pause

type "supabase\migrations\011_create_team_structure.sql" | clip

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
echo This will create:
echo - Teams table with default teams for NYTP
echo - Reporting manager assignments
echo - Team hierarchy structure
echo - Updated RLS policies for team-based access
echo.
pause 