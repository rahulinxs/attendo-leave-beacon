// direct-query.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pntrnltwvclbdmsnxlpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudHJubHR3dmNsYmRtc254bHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDU2NDEsImV4cCI6MjA2NDEyMTY0MX0.z8VSWJniNxqwiDmFEUmXCRDXisgjkZXqkYpzsQCy_us'
);

async function checkPolicies() {
  console.log('Checking RLS policies...');
  
  try {
    // Try a direct query to the attendance table
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying attendance table:', error);
    } else {
      console.log('Successfully queried attendance table. First row:', data[0]);
    }

    // Try to get the current user's role
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role');
    
    if (roleError) {
      console.error('Error getting user role:', roleError);
    } else {
      console.log('Current user role:', roleData);
    }

    // Try to list all tables to check permissions
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('*')
      .eq('schemaname', 'public');

    if (tablesError) {
      console.error('Error listing tables:', tablesError);
    } else {
      console.log('\nAvailable tables:');
      console.table(tables.map(t => t.tablename));
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkPolicies()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
