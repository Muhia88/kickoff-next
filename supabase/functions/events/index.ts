
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

        const checkAdmin = async () => {
            const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
            if (authError || !user) throw new Error('Unauthorized')

            const { data: profile, error } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('supabase_id', user.id)
                .single()

            if (error || !profile) return false
            return ['admin', 'supabase_admin', 'super_admin'].includes(profile.role)
        }

        const url = new URL(req.url)
        const path = url.pathname
        // path pattern: /events or /events/:id
        const segments = path.split('/')
        const lastSeg = segments[segments.length - 1]
        const id = !isNaN(Number(lastSeg)) ? Number(lastSeg) : null

        // GET One
        if (req.method === 'GET' && id !== null) {
            const { data, error } = await supabaseClient
                .from('events')
                .select('*')
                .eq('id', id)
                .single()

            if (error) return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // LIST
        if (req.method === 'GET') {
            // Sort by date usually? Flask code was just `Event.query.all()`.
            const { data, error } = await supabaseClient
                .from('events')
                .select('*')
                .order('date', { ascending: true })

            if (error) throw error
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // CREATE
        if (req.method === 'POST') {
            if (!(await checkAdmin())) return new Response('Forbidden', { status: 403, headers: corsHeaders })
            const body = await req.json()
            const { data, error } = await supabaseAdmin.from('events').insert(body).select().single()
            if (error) throw error
            return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // UPDATE
        if (req.method === 'PUT' && id !== null) {
            if (!(await checkAdmin())) return new Response('Forbidden', { status: 403, headers: corsHeaders })
            const body = await req.json()
            const { data, error } = await supabaseAdmin.from('events').update(body).eq('id', id).select().single()
            if (error) throw error
            return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // DELETE
        if (req.method === 'DELETE' && id !== null) {
            if (!(await checkAdmin())) return new Response('Forbidden', { status: 403, headers: corsHeaders })
            const { error } = await supabaseAdmin.from('events').delete().eq('id', id)
            if (error) throw error
            return new Response(JSON.stringify({ message: 'Event deleted' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
