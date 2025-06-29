import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://pntrnltwvclbdmsnxlpy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudHJubHR3dmNsYmRtc254bHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDU2NDEsImV4cCI6MjA2NDEyMTY0MX0.z8VSWJniNxqwiDmFEUmXCRDXisgjkZXqkYpzsQCy_us";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrateCompanies() {
  try {
    console.log('🚀 Starting companies migration...');
    
    // Step 1: Create companies table using RPC (if available)
    console.log('📋 Step 1: Creating companies table...');
    
    // Since we can't create tables via REST API, we'll need to use the SQL editor
    console.log('⚠️  Note: Table creation requires SQL Editor access');
    console.log('📄 Please run the SQL from migrate_to_nytp.sql in your Supabase SQL Editor');
    
    // Step 2: Insert NYTP company
    console.log('📋 Step 2: Inserting NYTP company...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([
        {
          name: 'New York Technology Partners (NYTP)',
          domain: 'nytp.com'
        }
      ])
      .select()
      .single();
    
    if (companyError) {
      if (companyError.code === '23505') { // Unique constraint violation
        console.log('✅ NYTP company already exists');
        // Get the existing company
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('*')
          .eq('name', 'New York Technology Partners (NYTP)')
          .single();
        company = existingCompany;
      } else {
        console.error('❌ Error creating company:', companyError);
        return;
      }
    } else {
      console.log('✅ NYTP company created successfully');
    }
    
    console.log('🎉 Migration completed!');
    console.log('📊 Next steps:');
    console.log('1. Run the SQL from migrate_to_nytp.sql in Supabase SQL Editor');
    console.log('2. This will add company_id columns and migrate existing data');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
migrateCompanies(); 