
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
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { action, user_id, plan, interval_days, payment_id } = await req.json();

        if (action === 'create') {
            if (!user_id) throw new Error("Missing user_id");

            const startDate = new Date().toISOString();
            // Insert Subscription
            const { data, error } = await supabaseAdmin
                .from('subscriptions')
                .insert({
                    user_id: user_id,
                    plan: plan || 'vip_monthly',
                    price: 2000,
                    interval_days: interval_days || 30,
                    status: 'pending',
                    start_date: startDate,
                    auto_renew: false
                })
                .select()
                .single();

            if (error) throw error;

            return new Response(JSON.stringify({ subscription: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (action === 'activate') {
            if (!user_id) throw new Error("Missing user_id");

            // 1. Calculate Expiry
            const now = new Date();
            const days = interval_days || 30;
            const expires = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

            // 2. Update Subscription Table (Find active/pending one? Or just update latest?)
            // We ideally need subscription_id. But if we lack it, we update the user's latest pending subscription?
            // Or better, just insert a new Active one if not passed.
            // But simpler: just update the user metadata as that's what controls access in frontend.

            // Update User Metadata for immediate access
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                user_id,
                { user_metadata: { is_vip: true, role: 'vip', vip_expires: expires.toISOString() } }
            );

            if (authError) throw authError;

            // 3. Update 'subscriptions' table if possible
            // We'll search for the latest pending subscription for this user and activate it.
            const { data: subs } = await supabaseAdmin
                .from('subscriptions')
                .select('id')
                .eq('user_id', user_id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1);

            if (subs && subs.length > 0) {
                await supabaseAdmin.from('subscriptions').update({
                    status: 'active',
                    start_date: now.toISOString(),
                    end_date: expires.toISOString(),
                    last_payment_id: payment_id || null
                }).eq('id', subs[0].id);
            } else {
                // If no pending subscription found (edge case), create one?
                await supabaseAdmin.from('subscriptions').insert({
                    user_id: user_id,
                    plan: 'vip_monthly',
                    price: 2000,
                    status: 'active',
                    start_date: now.toISOString(),
                    end_date: expires.toISOString(),
                    interval_days: 30,
                    last_payment_id: payment_id || null
                });
            }

            return new Response(JSON.stringify({ message: "Subscription activated" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error("Subscriptions Function Error", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
})
