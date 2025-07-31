-- SQL Script to Delete July Performance Data
-- Choose the appropriate option based on your needs

-- Option 1: Delete all July 2024 data (current year)
DELETE FROM performance_reports 
WHERE EXTRACT(MONTH FROM report_date) = 7 
AND EXTRACT(YEAR FROM report_date) = 2024;

-- Option 2: Delete all July data for any year
DELETE FROM performance_reports 
WHERE EXTRACT(MONTH FROM report_date) = 7;

-- Option 3: Delete July data for a specific company (replace 'your-company-id' with actual company ID)
DELETE FROM performance_reports 
WHERE EXTRACT(MONTH FROM report_date) = 7 
AND EXTRACT(YEAR FROM report_date) = 2024
AND company_id = 'your-company-id';

-- Option 4: Delete July data for a specific date range (July 1-31, 2024)
DELETE FROM performance_reports 
WHERE report_date >= '2024-07-01' 
AND report_date <= '2024-07-31';

-- Option 5: Delete July data with confirmation (safer approach)
-- First, check what will be deleted:
SELECT COUNT(*) as records_to_delete, 
       MIN(report_date) as earliest_date, 
       MAX(report_date) as latest_date
FROM performance_reports 
WHERE EXTRACT(MONTH FROM report_date) = 7 
AND EXTRACT(YEAR FROM report_date) = 2024;

-- Then run the delete if the count looks correct:
-- DELETE FROM performance_reports 
-- WHERE EXTRACT(MONTH FROM report_date) = 7 
-- AND EXTRACT(YEAR FROM report_date) = 2024;

-- Option 6: Delete July data for specific teams only (replace team IDs)
DELETE FROM performance_reports 
WHERE EXTRACT(MONTH FROM report_date) = 7 
AND EXTRACT(YEAR FROM report_date) = 2024
AND team_id IN ('team-id-1', 'team-id-2');

-- Option 7: Delete July data for specific users only (replace user IDs)
DELETE FROM performance_reports 
WHERE EXTRACT(MONTH FROM report_date) = 7 
AND EXTRACT(YEAR FROM report_date) = 2024
AND user_id IN ('user-id-1', 'user-id-2');

-- ==========================================
-- RECOMMENDED APPROACH:
-- ==========================================

-- Step 1: First, check what data exists for July
SELECT 
    company_id,
    team_id,
    user_id,
    report_date,
    COUNT(*) as record_count
FROM performance_reports 
WHERE EXTRACT(MONTH FROM report_date) = 7 
AND EXTRACT(YEAR FROM report_date) = 2024
GROUP BY company_id, team_id, user_id, report_date
ORDER BY report_date;

-- Step 2: If the data looks correct, run the delete
-- DELETE FROM performance_reports 
-- WHERE EXTRACT(MONTH FROM report_date) = 7 
-- AND EXTRACT(YEAR FROM report_date) = 2024;

-- Step 3: Verify deletion
SELECT COUNT(*) as remaining_july_records
FROM performance_reports 
WHERE EXTRACT(MONTH FROM report_date) = 7 
AND EXTRACT(YEAR FROM report_date) = 2024; 