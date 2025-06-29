const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error('- VITE_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runEmployeesMigration() {
    try {
        console.log('🚀 Starting employees table migration...');
        
        // Read the migration SQL
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, 'supabase', 'migrations', '025_ensure_employees_table_complete.sql');
        
        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Migration file not found:', migrationPath);
            process.exit(1);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📋 Executing migration SQL...');
        
        // Execute the migration
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
        
        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }
        
        console.log('✅ Migration completed successfully!');
        
        // Show current state
        console.log('\n📈 Current database state:');
        
        const { data: employeesCount } = await supabase
            .from('employees')
            .select('*', { count: 'exact' });
        
        const { data: teamsCount } = await supabase
            .from('teams')
            .select('*', { count: 'exact' });
        
        console.log(`- Total employees: ${employeesCount?.length || 0}`);
        console.log(`- Total teams: ${teamsCount?.length || 0}`);
        
        // Show employees with team assignments
        const { data: employeesWithTeams } = await supabase
            .from('employees')
            .select('id, name, department, team_id')
            .not('team_id', 'is', null);
        
        console.log(`- Employees with team assignments: ${employeesWithTeams?.length || 0}`);
        
        if (employeesWithTeams && employeesWithTeams.length > 0) {
            console.log('\n👥 Sample team assignments:');
            employeesWithTeams.slice(0, 5).forEach(employee => {
                console.log(`  - ${employee.name} (${employee.department}) -> Team ID: ${employee.team_id}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    }
}

// Run the migration
runEmployeesMigration(); 