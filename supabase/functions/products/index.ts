
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
    // Create client with the user's Auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Admin Client (Service Role) for privileged writes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Helper: Check Admin Role
    const checkAdmin = async () => {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !user) throw new Error('Unauthorized')

      // Check role in public.users linked by supabase_id (or checking meta if synced)
      // We fallback to checking the public table for reliability with existing data
      const { data: profile, error } = await supabaseAdmin // Use admin to read users if RLS blocks reading roles? 
        .from('users')
        .select('role')
        .eq('supabase_id', user.id)
        .single()

      if (error || !profile) return false
      return ['admin', 'supabase_admin', 'super_admin'].includes(profile.role)
    }

    const url = new URL(req.url)
    // Basic routing based on URL path parts
    // Expected patterns:
    // /products (root of function)
    // /products/categories
    // /products/:id

    // Since handler is mounted at /functions/v1/products, 
    // url.pathname will be /functions/v1/products/...

    const path = url.pathname
    const isCategories = path.includes('/categories')
    const isBrands = path.includes('/brands')

    const segments = path.split('/')
    const lastSeg = segments[segments.length - 1]
    const id = !isNaN(Number(lastSeg)) ? Number(lastSeg) : null

    // --- CATEGORIES ---
    if (isCategories) {
      if (req.method === 'GET') {
        const { data, error } = await supabaseClient.from('categories').select('*').order('name', { ascending: true })
        if (error) throw error
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (req.method === 'POST') {
        if (!(await checkAdmin())) return new Response('Forbidden', { status: 403, headers: corsHeaders })
        const body = await req.json()
        const { data, error } = await supabaseAdmin.from('categories').insert(body).select().single()
        if (error) throw error
        return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (req.method === 'PUT') {
        // handle update if needed
      }
    }

    // --- BRANDS ---
    if (isBrands) {
      if (req.method === 'GET') {
        const { data, error } = await supabaseClient.from('brands').select('*').order('name', { ascending: true })
        if (error) throw error
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (req.method === 'POST') {
        if (!(await checkAdmin())) return new Response('Forbidden', { status: 403, headers: corsHeaders })
        const body = await req.json()
        const { data, error } = await supabaseAdmin.from('brands').insert(body).select().single()
        if (error) throw error
        return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // --- PRODUCTS ---

    // GET ONE
    if (req.method === 'GET' && id !== null) {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*, category:categories(name), product_names(name)')
        .eq('id', id)
        .single()

      if (error) return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const item = { ...data, category: data.category?.name, name: data.product_names?.name }
      return new Response(JSON.stringify(item), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // LIST
    if (req.method === 'GET') {
      const q = url.searchParams.get('q')
      const ids = url.searchParams.get('ids')
      const page = Number(url.searchParams.get('page')) || 1
      const perPage = Number(url.searchParams.get('per_page')) || 24
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      let query = supabaseClient
        .from('products')
        .select('*, category:categories(name), product_names(name)', { count: 'exact' })

      if (q) query = query.ilike('product_names.name', `%${q}%`)
      if (ids) query = query.in('id', ids.split(','))

      query = query.range(from, to).order('id', { ascending: true })

      const { data, error, count } = await query
      if (error) throw error

      const items = data.map(p => ({
        ...p,
        category: p.category?.name,
        name: p.product_names?.name // Flatten name
      }))

      return new Response(JSON.stringify({
        items,
        page,
        per_page: perPage,
        total: count
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // CREATE
    if (req.method === 'POST') {
      if (!(await checkAdmin())) return new Response('Forbidden', { status: 403, headers: corsHeaders })
      const body = await req.json()
      const { data, error } = await supabaseAdmin.from('products').insert(body).select().single()
      if (error) throw error
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // UPDATE
    if (req.method === 'PUT' && id !== null) {
      if (!(await checkAdmin())) return new Response('Forbidden', { status: 403, headers: corsHeaders })
      const body = await req.json()
      const { data, error } = await supabaseAdmin.from('products').update(body).eq('id', id).select().single()
      if (error) throw error
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // DELETE
    if (req.method === 'DELETE' && id !== null) {
      if (!(await checkAdmin())) return new Response('Forbidden', { status: 403, headers: corsHeaders })
      const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
      if (error) throw error
      return new Response(JSON.stringify({ message: 'Product deleted' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
