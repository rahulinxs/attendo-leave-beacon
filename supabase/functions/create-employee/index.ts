
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateEmployeeRequest {
  name: string;
  email: string;
  role: string;  // This is the role name from frontend (e.g., "employee", "admin")
  department?: string;
  position?: string;
  password: string;
  company_id?: string;
  team_id?: string;
  reporting_manager_id?: string;
  hire_date?: string;
  is_active?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create regular client to verify the requesting user
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)
    
    // Verify the requesting user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Unauthorized')
    }

    console.log('Authenticated user:', user.id)

    // Use admin client to check user role (bypasses RLS)
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile query error:', profileError)
      throw new Error('Unable to query user profile')
    }

    if (!profiles || profiles.length === 0) {
      console.error('No profile found for user:', user.id)
      throw new Error('User profile not found')
    }

    const profile = profiles[0]
    console.log('User profile:', profile)

    if (!profile.role || !['admin', 'super_admin'].includes(profile.role)) {
      console.error('User role insufficient:', profile.role)
      throw new Error('Only admins can create employees')
    }

    const { name, email, role, department, position, password, company_id, team_id, reporting_manager_id, hire_date, is_active }: CreateEmployeeRequest = await req.json()

    console.log('Creating employee:', email);
    console.log('Company ID:', company_id);
    console.log('Team ID:', team_id);
    console.log('Reporting Manager ID:', reporting_manager_id);
    console.log('Full payload:', { name, email, role, department, position, company_id, team_id, reporting_manager_id, hire_date, is_active });

    // Get the correct role_id UUID from roles table
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', role)
      .eq('is_active', true)
      .single();

    if (roleError || !roleData) {
      console.error('Role lookup error:', roleError);
      console.error('Requested role:', role);
      console.error('Available roles: Check roles table for active entries');
      throw new Error(`Invalid role: ${role}. Role must be one of: admin, employee, reporting_manager, super_admin`);
    }

    const roleId = roleData.id;
    console.log('Using role_id:', roleId);

    // Create user with admin client
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role,
      },
      email_confirm: true,
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw createError
    }

    if (authData.user) {
      // Update the profile with additional information using UPSERT (profile may not exist)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email,
          name,
          role_id: roleId,  // Use UUID from roles table, not role text
          department: department || null,
          position: position || null,
          company_id: company_id || null,
          team_id: team_id || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('Profile upsert error:', profileError);
        console.error('Profile data attempted:', {
          id: authData.user.id,
          email,
          name,
          role,
          department: department || null,
          position: position || null,
          company_id: company_id || null,
          team_id: team_id || null
        });
        // Don't throw error here - profile creation is secondary to employee creation
      }

      // Also insert into employees table with all fields
      const employeeData = {
        id: authData.user.id,   // VERY IMPORTANT - link to auth.users.id
        name,
        email,
        role_id: roleId,  // Use the UUID from roles table
        department: department || null,
        position: position || null,
        company_id: company_id || null,  // Safe handling of undefined
        team_id: team_id || null,
        reporting_manager_id: reporting_manager_id || null,
        hire_date: hire_date || null,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Employee data to insert:', employeeData);

      // Use upsert to ensure we override any defaults
      const { data: insertedEmployee, error: employeeError } = await supabaseAdmin
        .from('employees')
        .upsert(employeeData, { onConflict: 'id' })
        .select()
        .single();

      console.log('Insert result:', { insertedEmployee, employeeError });

      if (employeeError) {
        console.error('Employee insert error:', employeeError)
        throw new Error(`Employee insert failed: ${employeeError.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: authData.user,
          message: 'Employee created successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    throw new Error('Failed to create user')

  } catch (error) {
    console.error('Error in create-employee function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
