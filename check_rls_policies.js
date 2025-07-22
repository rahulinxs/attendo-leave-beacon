const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://pntrnltwvclbdmsnxlpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudHJubHR3dmNsYmRtc254bHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDU2NDEsImV4cCI6MjA2NDEyMTY0MX0.z8VSWJniNxqwiDmFEUmXCRDXisgjkZXqkYpzsQCy_us';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  try {
    // Get all RLS policies for the attendance table
    const { data: policies, error } = await supabase
      .rpc('get_policies_for_table', { table_name: 'attendance' });
    
    if (error) {
      console.error('Error fetching RLS policies:', error);
      return;
    }

    console.log('Current RLS policies for attendance table:');
    console.table(policies);

    // Get the table schema to understand the structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'attendance');

    if (tableError) {
      console.error('Error fetching table schema:', tableError);
      return;
    }

    console.log('\nAttendance table schema:');
    console.table(tableInfo);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkRLSPolicies();
