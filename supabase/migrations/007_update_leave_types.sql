-- Migration: Redefine leave_types table and seed new leave types
-- Remove all old leave types
DELETE FROM leave_types;

-- Insert new leave types
INSERT INTO leave_types (name, description, max_days_per_year) VALUES
('Casual Leave', 'Casual leave (merges annual and personal leaves)', 26),
('Floating Holiday', 'Floating holiday, can be taken for any personal/religious reason', 2),
('Optional Holiday', 'Optional holiday, can be taken as per company policy', 2),
('Loss of Pay', 'Unpaid leave (loss of pay)', 365); 