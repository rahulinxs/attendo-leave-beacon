const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('Running Team Fix Migration');
console.log('========================================');
console.log('');
console.log('This script will copy the team fix migration SQL to your clipboard.');
console.log('Please run this SQL in your Supabase SQL Editor.');
console.log('');
console.log('Migration file: supabase/migrations/019_add_team_id_to_profiles.sql');
console.log('');

// Read the migration file
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '019_add_team_id_to_profiles.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('========================================');
console.log('SQL copied to clipboard!');
console.log('========================================');
console.log('');
console.log('Next steps:');
console.log('1. Go to your Supabase Dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Paste the SQL (Ctrl+V)');
console.log('4. Click "Run" to execute the migration');
console.log('');
console.log('This will:');
console.log('- Add team_id column to profiles table');
console.log('- Add reporting_manager_id column to profiles table');
console.log('- Add company_id column to profiles table');
console.log('- Establish foreign key relationships');
console.log('- Update existing profiles with team assignments');
console.log('- Update RLS policies for team-based access');
console.log('');
console.log('After running this migration, the team relationship errors should be resolved.');
console.log('');

// Copy to clipboard if possible
try {
  const { execSync } = require('child_process');
  execSync(`echo "${migrationSQL}" | clip`);
  console.log('✅ SQL copied to clipboard successfully!');
} catch (error) {
  console.log('⚠️  Could not copy to clipboard automatically.');
  console.log('Please manually copy the SQL from the migration file.');
} 