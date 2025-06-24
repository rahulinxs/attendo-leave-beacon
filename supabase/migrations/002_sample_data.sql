
-- Insert sample employees (these will be our demo users)
INSERT INTO employees (id, email, name, role, department, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@company.com', 'Sarah Johnson', 'admin', 'Human Resources', 'HR Manager'),
('550e8400-e29b-41d4-a716-446655440002', 'employee@company.com', 'John Smith', 'employee', 'Engineering', 'Software Developer'),
('550e8400-e29b-41d4-a716-446655440003', 'alice@company.com', 'Alice Wilson', 'employee', 'Marketing', 'Marketing Specialist'),
('550e8400-e29b-41d4-a716-446655440004', 'bob@company.com', 'Bob Brown', 'employee', 'Engineering', 'Senior Developer'),
('550e8400-e29b-41d4-a716-446655440005', 'carol@company.com', 'Carol White', 'employee', 'Sales', 'Sales Representative');

-- Insert leave balances for current year
INSERT INTO leave_balances (employee_id, leave_type_id, year, allocated_days, used_days) 
SELECT 
    e.id as employee_id,
    lt.id as leave_type_id,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    lt.max_days_per_year as allocated_days,
    CASE 
        WHEN lt.name = 'Annual Leave' THEN FLOOR(RANDOM() * 10)
        WHEN lt.name = 'Sick Leave' THEN FLOOR(RANDOM() * 5)
        ELSE FLOOR(RANDOM() * 3)
    END as used_days
FROM employees e
CROSS JOIN leave_types lt
WHERE e.is_active = true;

-- Insert sample attendance records for the last week
INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status)
SELECT 
    e.id,
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6),
    CASE 
        WHEN EXTRACT(DOW FROM CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6)) IN (0, 6) THEN NULL
        ELSE (CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6) + TIME '09:00:00' + INTERVAL '1 minute' * FLOOR(RANDOM() * 30))
    END,
    CASE 
        WHEN EXTRACT(DOW FROM CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6)) IN (0, 6) THEN NULL
        ELSE (CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6) + TIME '18:00:00' + INTERVAL '1 minute' * FLOOR(RANDOM() * 60))
    END,
    CASE 
        WHEN EXTRACT(DOW FROM CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6)) IN (0, 6) THEN 'holiday'
        WHEN RANDOM() < 0.9 THEN 'present'
        ELSE 'absent'
    END
FROM employees e
WHERE e.is_active = true AND e.role = 'employee';

-- Insert sample leave requests
INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status, approved_by, approved_at)
VALUES
(
    '550e8400-e29b-41d4-a716-446655440002',
    (SELECT id FROM leave_types WHERE name = 'Annual Leave' LIMIT 1),
    CURRENT_DATE + INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '17 days',
    3,
    'Family vacation',
    'pending',
    NULL,
    NULL
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    (SELECT id FROM leave_types WHERE name = 'Sick Leave' LIMIT 1),
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE - INTERVAL '5 days',
    1,
    'Doctor appointment',
    'approved',
    '550e8400-e29b-41d4-a716-446655440001',
    CURRENT_DATE - INTERVAL '4 days'
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    (SELECT id FROM leave_types WHERE name = 'Personal Leave' LIMIT 1),
    CURRENT_DATE + INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '11 days',
    2,
    'Personal matters',
    'pending',
    NULL,
    NULL
);
