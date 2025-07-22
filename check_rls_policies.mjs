import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'https://pntrnltwvclbdmsnxlpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudHJubHR3dmNsYmRtc254bHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDU2NDEsImV4cCI6MjA2NDEyMTY0MX0.z8VSWJniNxqwiDmFEUmXCRDXisgjkZXqkYpzsQCy_us';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  try {
    // First, let's check if the function exists
    const { data: functions, error: funcError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'attendance' });
    
    if (funcError) {
      console.log('Function get_policies_for_table does not exist, trying direct query...');
      
      // If the function doesn't exist, try a direct query to the pg_policies table
      const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'attendance');
      
      if (error) {
        console.error('Error fetching RLS policies:', error);
      } else {
        console.log('Current RLS policies for attendance table:');
        console.table(policies);
      }
    } else {
      console.log('Current RLS policies for attendance table:');
      console.table(functions);
    }

    // Get the table schema to understand the structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'attendance');

    if (tableError) {
      console.error('Error fetching table schema:', tableError);
    } else {
      console.log('\nAttendance table schema:');
      console.table(tableInfo);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkRLSPolicies();
