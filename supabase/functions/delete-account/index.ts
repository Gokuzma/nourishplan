import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // CRITICAL: Extract user ID from JWT, NOT from request body
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: authErr } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id

    // Parse request body for optional newAdminUserId
    const body = await req.json().catch(() => ({}))
    const { newAdminUserId } = body as { newAdminUserId?: string }

    // Get the user's household membership
    const { data: memberRow, error: memberErr } = await adminClient
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', userId)
      .maybeSingle()

    if (memberErr) {
      return new Response(JSON.stringify({ error: 'Failed to read membership' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (memberRow) {
      const householdId = memberRow.household_id

      // Count household members
      const { count, error: countErr } = await adminClient
        .from('household_members')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId)

      if (countErr) {
        return new Response(JSON.stringify({ error: 'Failed to count members' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (count === 1) {
        // Last member — delete the household (cascades all child data via FK)
        const { error: deleteHouseholdErr } = await adminClient
          .from('households')
          .delete()
          .eq('id', householdId)

        if (deleteHouseholdErr) {
          return new Response(JSON.stringify({ error: 'Failed to delete household' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else {
        // Multiple members
        if (memberRow.role === 'admin' && newAdminUserId) {
          // Transfer admin role to selected member
          const { error: transferErr } = await adminClient
            .from('household_members')
            .update({ role: 'admin' })
            .eq('household_id', householdId)
            .eq('user_id', newAdminUserId)

          if (transferErr) {
            return new Response(JSON.stringify({ error: 'Failed to transfer admin role' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
        }

        // Remove user from household
        const { error: removeMemberErr } = await adminClient
          .from('household_members')
          .delete()
          .eq('user_id', userId)

        if (removeMemberErr) {
          return new Response(JSON.stringify({ error: 'Failed to remove membership' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    // Delete the auth user (cascades profiles via FK)
    const { error: deleteUserErr } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteUserErr) {
      return new Response(JSON.stringify({ error: deleteUserErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
