
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get current user from Auth header (to verify they are authorized to make changes)
        // NOTE: kickoff-admin-next currently uses Supabase Auth.
        // We need to check if the caller is a 'super_admin'.
        // This logic depends on whether we are already using the 'admins' table for Auth or 'users'.
        // Based on AuthContext, we check 'users' table or edge function.
        // We will Trust the Authorization header for identity, then check their role.

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }

        // Verify Super Admin Role
        // Check `users` table first (current implementation) OR `admins` table if identity is there.
        // The user said: "superadmin is incharge... superadmin created is input in the 'admins' table".
        // This implies we should check the `admins` table?
        // But `user.id` is a UUID from Supabase Auth. `admins.id` is Integer (legacy).
        // If they are not linked, we can't link Supabase Auth User -> Admin Table Record easily without a bridge.
        // FOR NOW: We will assume the requester has 'super_admin' role in the `users` table (synced from legacy logic where we might have migrated superadmin)
        // OR we check the `admins` table by email?

        let isSuperAdmin = false;

        // Check public.users (Linked to Supabase Auth)
        const { data: dbUser } = await supabaseAdmin.from('users').select('role').eq('supabase_id', user.id).single();
        if (dbUser && dbUser.role === 'super_admin') {
            isSuperAdmin = true;
        }

        // If not found, maybe check admins table by email? (If we allow mixed auth)
        if (!isSuperAdmin) {
            const { data: adminUser } = await supabaseAdmin.from('admins').select('role').eq('email', user.email).single();
            if (adminUser && adminUser.role === 'super_admin') {
                isSuperAdmin = true;
            }
        }

        if (!isSuperAdmin) {
            return new Response(JSON.stringify({ error: 'Forbidden: Super Admin access required' }), { status: 403, headers: corsHeaders });
        }

        const { action, username, email, password, role, can_manage_products, can_manage_events, id } = await req.json();

        if (req.method === 'GET' || action === 'list') {
            const { data: admins, error } = await supabaseAdmin
                .from('admins')
                .select('id, username, email, role, can_manage_products, can_manage_events, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return new Response(JSON.stringify(admins), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (req.method === 'POST' || action === 'create') {
            if (!username || !email || !password) {
                return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
            }

            // Check if exists
            const { data: existing } = await supabaseAdmin.from('admins').select('id').or(`username.eq.${username},email.eq.${email}`).single();
            if (existing) {
                return new Response(JSON.stringify({ error: 'Admin with this username or email already exists' }), { status: 400, headers: corsHeaders });
            }

            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            const { data: newAdmin, error } = await supabaseAdmin.from('admins').insert({
                username,
                email,
                password_hash,
                role: role || 'admin',
                can_manage_products: can_manage_products || false,
                can_manage_events: can_manage_events || false,
                created_at: new Date().toISOString()
            }).select().single();

            if (error) throw error;
            return new Response(JSON.stringify(newAdmin), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (req.method === 'PUT' || action === 'update_permissions') {
            if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400, headers: corsHeaders });

            const updates: any = {};
            if (can_manage_products !== undefined) updates.can_manage_products = can_manage_products;
            if (can_manage_events !== undefined) updates.can_manage_events = can_manage_events;
            if (role !== undefined) updates.role = role;

            const { data: updated, error } = await supabaseAdmin
                .from('admins')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return new Response(JSON.stringify(updated), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (req.method === 'DELETE' || action === 'delete') {
            if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400, headers: corsHeaders });

            const { error } = await supabaseAdmin.from('admins').delete().eq('id', id);
            if (error) throw error;
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
