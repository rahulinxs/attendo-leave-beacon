import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pntrnltwvclbdmsnxlpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudHJubHR3dmNsYmRtc254bHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDU2NDEsImV4cCI6MjA2NDEyMTY0MX0.z8VSWJniNxqwiDmFEUmXCRDXisgjkZXqkYpzsQCy_us';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  try {
    // SQL query to get RLS policies for the attendance table
    const { data: policies, error } = await supabase.rpc('rls_policies_for_table', { 
      table_name: 'attendance' 
    });
    
    if (error) {
      console.error('Error executing RLS policy query:', error);
      
      // If the function doesn't exist, try a direct SQL query
      console.log('Trying direct SQL query...');
      const { data, error: sqlError } = await supabase.rpc('rpc', {
        query: `
          SELECT 
            n.nspname AS schema_name,
            c.relname AS table_name,
            pol.polname AS policy_name,
            CASE WHEN pol.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS policy_type,
            CASE WHEN pol.polwithcheck IS NOT NULL THEN 'WITH CHECK' ELSE 'USING' END AS policy_scope,
            pg_get_expr(pol.polqual, pol.polrelid) AS policy_expression,
            pg_get_expr(pol.polwithcheck, pol.polrelid) AS policy_check,
            array_to_string(array(
              SELECT pg_get_userbyid(roleid) 
              FROM unnest(pol.polroles) AS roleid
            ), ', ') AS roles_applied_to
          FROM pg_policy pol
          JOIN pg_class c ON pol.polrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE c.relname = 'attendance' AND n.nspname = 'public';
        `
      });
      
      if (sqlError) {
        console.error('Error executing direct SQL query:', sqlError);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('Current RLS policies for attendance table:');
        console.table(data);
      } else {
        console.log('No RLS policies found for the attendance table.');
      }
    } else if (policies && policies.length > 0) {
      console.log('Current RLS policies for attendance table:');
      console.table(policies);
    } else {
      console.log('No RLS policies found for the attendance table.');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkRLSPolicies();
