// create-rls-policies.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pntrnltwvclbdmsnxlpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudHJubHR3dmNsYmRtc254bHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDU2NDEsImV4cCI6MjA2NDEyMTY0MX0.z8VSWJniNxqwiDmFEUmXCRDXisgjkZXqkYpzsQCy_us'
);

async function createReportingManagerPolicies() {
  console.log('Creating RLS policies for reporting managers...\n');
  
  // 1. Policy for viewing team attendance
  const selectPolicy = await supabase.rpc('rpc', {
    query: `
      CREATE POLICY "Reporting managers can view team attendance" ON attendance
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = attendance.employee_id
          AND employees.reporting_manager_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = auth.uid()
          AND employees.role = 'reporting_manager'
        )
      );
    `
  });
  console.log('✅ Created SELECT policy for reporting managers');

  // 2. Policy for inserting team attendance
  const insertPolicy = await supabase.rpc('rpc', {
    query: `
      CREATE POLICY "Reporting managers can insert team attendance" ON attendance
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = attendance.employee_id
          AND employees.reporting_manager_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = auth.uid()
          AND employees.role = 'reporting_manager'
        )
      );
    `
  });
  console.log('✅ Created INSERT policy for reporting managers');

  // 3. Policy for updating team attendance
  const updatePolicy = await supabase.rpc('rpc', {
    query: `
      CREATE POLICY "Reporting managers can update team attendance" ON attendance
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = attendance.employee_id
          AND employees.reporting_manager_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = auth.uid()
          AND employees.role = 'reporting_manager'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = attendance.employee_id
          AND employees.reporting_manager_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = auth.uid()
          AND employees.role = 'reporting_manager'
        )
      );
    `
  });
  console.log('✅ Created UPDATE policy for reporting managers');

  // 4. Policy for deleting team attendance
  const deletePolicy = await supabase.rpc('rpc', {
    query: `
      CREATE POLICY "Reporting managers can delete team attendance" ON attendance
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = attendance.employee_id
          AND employees.reporting_manager_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = auth.uid()
          AND employees.role = 'reporting_manager'
        )
      );
    `
  });
  console.log('✅ Created DELETE policy for reporting managers');

  // Verify the policies were created
  const { data: policies } = await supabase.rpc('rpc', {
    query: `
      SELECT 
        policyname as name,
        cmd as operation,
        permissive,
        roles,
        qual as using_expression
      FROM pg_policies 
      WHERE tablename = 'attendance'
      AND policyname LIKE '%reporting%'
      ORDER BY policyname;
    `
  });

  console.log('\n✅ Created the following RLS policies:');
  console.table(policies);
}

createReportingManagerPolicies()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error creating RLS policies:', error);
    process.exit(1);
  });
