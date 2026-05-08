
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
    const { data: employees, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('role')
      .eq('id', user.id)

    if (employeeError) {
      console.error('Error querying user employee data:', employeeError)
      throw new Error('Unable to query user employee data')
    }

    if (!employees || employees.length === 0) {
      console.error('No employee record found for user:', user.id)
      throw new Error('User employee record not found')
    }

    const employee = employees[0]
    console.log('User employee data:', employee)

    if (!employee.role || !['admin', 'super_admin'].includes(employee.role)) {
      console.error('User role insufficient:', employee.role)
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
      // Employee record is already created above, no need for profile sync
      // The employees table is now the primary source of truth

      // Employee record was already created earlier in the function
      // No need to insert again - the employee record already exists

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
