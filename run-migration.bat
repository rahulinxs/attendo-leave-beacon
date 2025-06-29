@echo off
echo ========================================
echo    AttendEase Migration Runner
echo ========================================
echo.
echo This will help you run the companies migration.
echo.
echo Options:
echo 1. Run via Supabase CLI (if linked)
echo 2. Copy SQL to clipboard for manual execution
echo 3. Open SQL file in default editor
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Attempting to run migration via Supabase CLI...
    npx supabase db push
    if errorlevel 1 (
        echo.
        echo ❌ Supabase CLI failed. Please try option 2 or 3.
    ) else (
        echo.
        echo ✅ Migration completed successfully!
    )
) else if "%choice%"=="2" (
    echo.
    echo Copying migration SQL to clipboard...
    type "supabase\migrations\010_create_companies_and_migrate_data.sql" | clip
    echo ✅ SQL copied to clipboard!
    echo.
    echo 📋 Next steps:
    echo 1. Go to your Supabase Dashboard
    echo 2. Navigate to SQL Editor
    echo 3. Paste the SQL (Ctrl+V)
    echo 4. Click "Run"
) else if "%choice%"=="3" (
    echo.
    echo Opening SQL file in default editor...
    start "" "supabase\migrations\010_create_companies_and_migrate_data.sql"
    echo ✅ SQL file opened!
) else (
    echo.
    echo ❌ Invalid choice. Please run the script again.
)

echo.
pause 