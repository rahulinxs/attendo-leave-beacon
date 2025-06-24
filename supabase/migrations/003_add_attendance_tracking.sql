-- Add tracking fields to attendance table for super admin changes
ALTER TABLE attendance 
ADD COLUMN updated_by UUID REFERENCES employees(id),
ADD COLUMN change_reason TEXT;

-- Add comment to explain the new fields
COMMENT ON COLUMN attendance.updated_by IS 'ID of the employee who last updated this attendance record';
COMMENT ON COLUMN attendance.change_reason IS 'Reason for the status change, especially for administrative corrections';

-- Update the status check constraint to include 'half_day'
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check 
CHECK (status IN ('present', 'absent', 'late', 'half_day', 'holiday'));

-- Add pending_approval field for backdated entries
ALTER TABLE attendance 
ADD COLUMN pending_approval BOOLEAN DEFAULT false;

COMMENT ON COLUMN attendance.pending_approval IS 'Flag to indicate if this entry needs approval (for backdated entries)';

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  description TEXT
);

-- Insert default late mark time if not exists
INSERT INTO system_settings (key, value, description)
VALUES ('late_mark_time', '09:30', 'Time after which check-in is considered late (HH:MM, 24h format)')
ON CONFLICT (key) DO NOTHING; 