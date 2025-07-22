// verify-policies.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pntrnltwvclbdmsnxlpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudHJubHR3dmNsYmRtc254bHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDU2NDEsImV4cCI6MjA2NDEyMTY0MX0.z8VSWJniNxqwiDmFEUmXCRDXisgjkZXqkYpzsQCy_us'
);

async function verifyPolicies() {
  console.log('Fetching current RLS policies...\n');
  
  try {
    const { data: policies, error } = await supabase.rpc('rpc', {
      query: `
        SELECT 
          policyname as name,
          cmd as operation,
          permissive,
          roles,
          qual as using_expression,
          with_check
        FROM pg_policies 
        WHERE tablename = 'attendance'
        ORDER BY policyname;
      `
    });

    if (error) throw error;

    console.log('Current RLS policies for attendance table:');
    console.table(policies);
    
    // Check for reporting manager policies
    const reportingManagerPolicies = policies.filter(policy => 
      policy.name.toLowerCase().includes('reporting') || 
      policy.name.toLowerCase().includes('manager')
    );

    if (reportingManagerPolicies.length === 0) {
      console.log('\n❌ No reporting manager policies found!');
    } else {
      console.log('\n✅ Found reporting manager policies:');
      console.table(reportingManagerPolicies);
    }
    
  } catch (error) {
    console.error('Error fetching policies:', error);
  }
}

verifyPolicies()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
