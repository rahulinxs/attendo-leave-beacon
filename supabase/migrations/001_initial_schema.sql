
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create employees table
CREATE TABLE employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('employee', 'admin')) DEFAULT 'employee',
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late', 'holiday')) DEFAULT 'present',
    notes TEXT,
    location JSONB, -- For storing geolocation data if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Create leave_types table
CREATE TABLE leave_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    max_days_per_year INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leave_requests table
CREATE TABLE leave_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    admin_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leave_balances table
CREATE TABLE leave_balances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id),
    year INTEGER NOT NULL,
    allocated_days INTEGER DEFAULT 0,
    used_days INTEGER DEFAULT 0,
    remaining_days INTEGER GENERATED ALWAYS AS (allocated_days - used_days) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, leave_type_id, year)
);

-- Insert default leave types
INSERT INTO leave_types (name, description, max_days_per_year) VALUES
('Annual Leave', 'Yearly vacation leave', 21),
('Sick Leave', 'Medical leave for illness', 10),
('Personal Leave', 'Personal time off', 5),
('Maternity/Paternity Leave', 'Leave for new parents', 90),
('Emergency Leave', 'Unexpected urgent situations', 3);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table
CREATE POLICY "Employees can view their own data" ON employees
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all employees" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert employees" ON employees
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update employees" ON employees
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- Create policies for attendance table
CREATE POLICY "Employees can view their own attendance" ON attendance
    FOR SELECT USING (employee_id::text = auth.uid()::text);

CREATE POLICY "Admins can view all attendance" ON attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Employees can insert their own attendance" ON attendance
    FOR INSERT WITH CHECK (employee_id::text = auth.uid()::text);

CREATE POLICY "Admins can insert any attendance" ON attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Employees can update their own attendance" ON attendance
    FOR UPDATE USING (employee_id::text = auth.uid()::text);

CREATE POLICY "Admins can update any attendance" ON attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- Create policies for leave_types table
CREATE POLICY "Everyone can view leave types" ON leave_types
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage leave types" ON leave_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- Create policies for leave_requests table
CREATE POLICY "Employees can view their own leave requests" ON leave_requests
    FOR SELECT USING (employee_id::text = auth.uid()::text);

CREATE POLICY "Admins can view all leave requests" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Employees can insert their own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (employee_id::text = auth.uid()::text);

CREATE POLICY "Employees can update their own pending leave requests" ON leave_requests
    FOR UPDATE USING (
        employee_id::text = auth.uid()::text AND status = 'pending'
    );

CREATE POLICY "Admins can update any leave request" ON leave_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- Create policies for leave_balances table
CREATE POLICY "Employees can view their own leave balances" ON leave_balances
    FOR SELECT USING (employee_id::text = auth.uid()::text);

CREATE POLICY "Admins can view all leave balances" ON leave_balances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage leave balances" ON leave_balances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );
