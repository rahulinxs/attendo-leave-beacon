const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = "https://pntrnltwvclbdmsnxlpy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudHJubHR3dmNsYmRtc254bHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDU2NDEsImV4cCI6MjA2NDEyMTY0MX0.z8VSWJniNxqwiDmFEUmXCRDXisgjkZXqkYpzsQCy_us";

// Read the migration SQL file
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '010_create_companies_and_migrate_data.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function runMigration() {
  try {
    console.log('🚀 Starting migration...');
    console.log('📝 This will create the companies table and migrate existing data to NYTP');
    
    // Since we can't run raw SQL through the REST API, we'll need to use the SQL editor
    // Let's create a simplified version that uses the Supabase client operations
    
    console.log('📋 Migration steps:');
    console.log('1. Create companies table');
    console.log('2. Insert NYTP company');
    console.log('3. Add company_id to existing tables');
    console.log('4. Migrate existing data');
    
    console.log('\n⚠️  Note: This migration requires manual execution in Supabase SQL Editor');
    console.log('📄 The migration SQL has been saved to: supabase/migrations/010_create_companies_and_migrate_data.sql');
    console.log('📄 Manual migration script: migrate_to_nytp.sql');
    
    console.log('\n🔗 To run this migration:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of migrate_to_nytp.sql');
    console.log('4. Click "Run"');
    
    console.log('\n✅ Migration files are ready!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the migration
runMigration(); 