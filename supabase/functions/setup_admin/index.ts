
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const email = 'admin@kickoff.com';
        const password = 'kickoff_admin_to_the_moon';

        // 1. Create Identity
        // Check if exists
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        let user = users.find(u => u.email === email);
        let msg = '';

        if (!user) {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });
            if (error) throw error;
            user = data.user;
            msg += 'User created. ';
        } else {
            // Reset password just in case
            await supabaseAdmin.auth.admin.updateUserById(user.id, { password: password });
            msg += 'User exists. Password reset. ';
        }

        // 2. Set Role
        // Check public.users
        const { data: dbUser, error: dbError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('supabase_id', user.id)
            .single();

        if (dbUser) {
            await supabaseAdmin.from('users').update({ role: 'super_admin' }).eq('supabase_id', user.id);
            msg += 'Role updated to super_admin.';
        } else {
            await supabaseAdmin.from('users').insert({
                supabase_id: user.id,
                email,
                role: 'super_admin',
                name: 'Super Admin',
                phone: '0700000000'
            });
            msg += 'Public user created with super_admin role.';
        }

        return new Response(JSON.stringify({ message: msg, email, password }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }
})
