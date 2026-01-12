
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const url = new URL(req.url)
        const path = url.pathname
        const segments = path.split('/')
        // /users or /users/me or /users/:id
        const lastSeg = segments[segments.length - 1]

        // Check Auth
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

        const checkAdmin = async () => {
            if (!user) return false
            const { data: profile } = await supabaseAdmin.from('users').select('role').eq('supabase_id', user.id).single()
            return ['admin', 'supabase_admin', 'super_admin'].includes(profile?.role)
        }

        // GET /users/me
        if (req.method === 'GET' && lastSeg === 'me') {
            if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

            // Use Admin Client to bypass RLS since we verified Auth
            const { data, error } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('supabase_id', user.id)
                .single()
            if (error) throw error
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // GET /users/:id
        if (req.method === 'GET' && !isNaN(Number(lastSeg))) {
            const id = Number(lastSeg)
            // Check permissions? Usually public or owner only.
            // Flask code allowed public access (or at least no auth check). 
            // We'll allow public for now or assume existing RLS handles it.
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('id', id)
                .single()
            if (error) return new Response('Not Found', { status: 404, headers: corsHeaders })
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // LIST /users
        if (req.method === 'GET') {
            if (!(await checkAdmin())) return new Response('Forbidden', { status: 403, headers: corsHeaders })

            const { data, error } = await supabaseClient.from('users').select('*')
            if (error) throw error
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
