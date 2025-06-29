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

async function fixProfilesRLS() {
    try {
        console.log('🔧 Fixing profiles RLS recursion issue...');
        
        // Read the migration SQL
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, 'supabase', 'migrations', '021_fix_profiles_rls_recursion.sql');
        
        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Migration file not found:', migrationPath);
            process.exit(1);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📋 Executing RLS fix SQL...');
        
        // Execute the migration
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
        
        if (error) {
            console.error('❌ RLS fix failed:', error);
            process.exit(1);
        }
        
        console.log('✅ RLS policies fixed successfully!');
        
        // Test if we can now query profiles
        console.log('🧪 Testing profiles query...');
        
        const { data: profiles, error: testError } = await supabase
            .from('profiles')
            .select('id, email, name, role')
            .limit(5);
        
        if (testError) {
            console.error('❌ Still having issues with profiles query:', testError);
        } else {
            console.log('✅ Profiles query working! Found', profiles?.length || 0, 'profiles');
            if (profiles && profiles.length > 0) {
                console.log('📋 Sample profiles:');
                profiles.forEach(profile => {
                    console.log(`  - ${profile.name} (${profile.email}) - ${profile.role}`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    }
}

// Run the fix
fixProfilesRLS(); 