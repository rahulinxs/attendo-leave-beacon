import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface SyncPayload {
  record: {
    id: string;
    team_id?: string;
    reporting_manager_id?: string;
    company_id: string;
    name?: string;
    email?: string;
  };
  old_record?: {
    team_id?: string;
    reporting_manager_id?: string;
    company_id: string;
  };
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
}

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload: SyncPayload = await req.json()

    // Validate payload
    if (!payload.record || !payload.table) {
      return new Response("Invalid payload: missing record or table", { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const record = payload.record
    const oldRecord = payload.old_record

    console.log(`Sync event: ${payload.type} on ${payload.table}`, {
      recordId: record.id,
      company_id: record.company_id
    })

    // Handle different table events
    switch (payload.table) {
      case 'employees':
        await handleEmployeeSync(supabase, record, oldRecord)
        break
      case 'teams':
        await handleTeamSync(supabase, record, oldRecord)
        break
      case 'profiles':
        await handleProfileSync(supabase, record, oldRecord)
        break
      default:
        console.log(`Unhandled table: ${payload.table}`)
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Sync completed',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function handleEmployeeSync(
  supabase: any,
  record: any,
  oldRecord: any
) {
  // Employee team change - update performance reports
  if (record.team_id !== oldRecord?.team_id) {
    console.log(`Updating performance reports for employee ${record.id} to team ${record.team_id}`)
    
    const { error } = await supabase
      .from("performance_reports")
      .update({ team_id: record.team_id })
      .eq("user_id", record.id)
      .eq("company_id", record.company_id)

    if (error) {
      throw new Error(`Failed to update performance reports: ${error.message}`)
    }
  }

  // Employee manager change - update profile
  if (record.reporting_manager_id !== oldRecord?.reporting_manager_id) {
    console.log(`Updating profile for employee ${record.id} to manager ${record.reporting_manager_id}`)
    
    const { error } = await supabase
      .from("profiles")
      .update({
        reporting_manager_id: record.reporting_manager_id
      })
      .eq("id", record.id)
      .eq("company_id", record.company_id)

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }
  }
}

async function handleTeamSync(
  supabase: any,
  record: any,
  oldRecord: any
) {
  // Team manager change - update all employees in team
  if (record.manager_id !== oldRecord?.manager_id) {
    console.log(`Updating all employees in team ${record.id} to manager ${record.manager_id}`)
    
    // First update employees
    const { error: empError } = await supabase
      .from("employees")
      .update({ reporting_manager_id: record.manager_id })
      .eq("team_id", record.id)
      .eq("company_id", record.company_id)

    if (empError) {
      throw new Error(`Failed to update employees: ${empError.message}`)
    }

    // Then update profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        reporting_manager_id: record.manager_id
      })
      .eq("team_id", record.id)
      .eq("company_id", record.company_id)

    if (profileError) {
      throw new Error(`Failed to update profiles: ${profileError.message}`)
    }
  }
}

async function handleProfileSync(
  supabase: any,
  record: any,
  oldRecord: any
) {
  // Profile changes are already handled by the trigger sync_profile_to_employee
  // This is just for additional real-time notifications if needed
  console.log(`Profile sync event for ${record.id}`, {
    team_id: record.team_id,
    reporting_manager_id: record.reporting_manager_id
  })
}
