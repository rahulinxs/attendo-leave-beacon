@echo off
echo ========================================
echo   AttendEdge Supabase Migration Runner
echo ========================================
echo.

REM Link project (safe to re-run, will overwrite .supabase/config.toml)
echo Linking Supabase project...
npx supabase link --project-ref pntrnltwvclbdmsnxlpy

IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to link Supabase project.
    pause
    exit /b 1
)

echo.
echo ✅ Project linked successfully!
echo.

echo Pushing migrations to Supabase...
npx supabase db push

IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Migration push failed.
    pause
    exit /b 1
)

echo.
echo ✅ Migrations pushed successfully!
pause 