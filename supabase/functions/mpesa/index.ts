
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // Create admin client for writing to restricted tables/columns
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { action, order_id, event_id, quantity, phone_number, plan } = await req.json();

        if (action === 'initiate') {
            if ((!order_id && !event_id && !plan) || !phone_number) {
                return new Response(JSON.stringify({ error: 'Missing order_id/event_id/plan or phone_number' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            let targetAmount = 0;
            const subscriptionsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/subscriptions`;
            const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

            // 1. Validate Order / Event / Plan
            if (order_id) {
                const { data: order, error: orderError } = await supabaseAdmin
                    .from('orders')
                    .select('metadata, user_id')
                    .eq('id', order_id)
                    .single();

                if (orderError || !order) {
                    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
                targetAmount = order.metadata?.total_price || 0;
            } else if (event_id) {
                const { data: event, error: eventError } = await supabaseAdmin
                    .from('events')
                    .select('*')
                    .eq('id', event_id)
                    .single();

                if (eventError || !event) {
                    return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
                const price = Number(event.ticket_price ?? event.price ?? 0);
                targetAmount = price * (quantity || 1);
            } else if (plan === 'vip') {
                targetAmount = 2000;
                // Create Pending Subscription
                try {
                    await fetch(subscriptionsUrl, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'create', user_id: user.id, plan: 'vip_monthly' })
                    });
                } catch (e) {
                    console.error("Failed to create pending subscription:", e);
                }
            }

            // 2. Create Payment Record (Pending)
            const { data: payment, error: paymentError } = await supabaseAdmin
                .from('payments')
                .insert({
                    order_id: order_id || null,
                    raw_payload: event_id ? { event_id, quantity: quantity || 1, user_id: user.id }
                        : plan ? { plan, user_id: user.id }
                            : null,
                    provider: 'mpesa',
                    amount: targetAmount,
                    phone_number: phone_number,
                    status: 'pending',
                    provider_transaction_id: `sim-${Date.now()}`
                })
                .select()
                .single();

            if (paymentError) {
                console.error("Payment creation error:", paymentError);
                return new Response(JSON.stringify({ error: 'Failed to create payment record' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // Check M-Pesa Config
            const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
            const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
            const passkey = Deno.env.get('MPESA_PASSKEY');
            const shortcode = Deno.env.get('MPESA_SHORTCODE');
            const callbackBase = Deno.env.get('MPESA_CALLBACK_BASE') || 'https://theearlykickoff.co.ke';
            const callbackUrl = `${callbackBase}/api/payments/mpesa/webhook`;

            // 3. Simulation Logic
            if (!shortcode || !passkey || !consumerKey || !consumerSecret) {
                console.log("M-Pesa Config missing. Using SIMULATION mode.");

                await supabaseAdmin.from('payments').update({
                    status: 'success',
                    provider_transaction_id: `SIM-${Date.now()}`,
                    raw_payload: { simulation: true, message: "Simulated Success" }
                }).eq('id', payment.id);

                const ticketsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/tickets`;
                const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

                // Logic based on Type
                if (order_id) {
                    await supabaseAdmin.from('orders').update({ status: 'paid' }).eq('id', order_id);
                    try {
                        await fetch(ticketsUrl, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'create_order_qr', order_id: order_id })
                        });
                    } catch (e) { console.error("Order QR Gen Error", e); }

                } else if (event_id) {
                    try {
                        await fetch(ticketsUrl, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'create_tickets', event_id, user_id: user.id, quantity: quantity || 1 })
                        });
                    } catch (e) { console.error("Ticket Gen Error", e); }

                } else if (plan === 'vip') {
                    // Activate VIP
                    try {
                        await fetch(subscriptionsUrl, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'activate', user_id: user.id, payment_id: payment.id })
                        });
                    } catch (e) {
                        console.error("VIP Activation Error", e);
                    }
                }

                return new Response(JSON.stringify({
                    status: 'initiated',
                    payment_id: payment.id,
                    message: 'M-Pesa Simulation: Success'
                }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // 4. Real STK Push (Omitted for brevity, assumed unchanged from previous steps)
            // But I need to include it or I lose it if I use write_to_file!
            // I MUST include the Real STK Push logic here.

            // ... Authenticate ...
            let accessToken = '';
            try {
                const auth = btoa(`${consumerKey}:${consumerSecret}`);
                const tokenResp = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
                    headers: { 'Authorization': `Basic ${auth}` }
                });
                if (tokenResp.ok) {
                    const tokenData = await tokenResp.json();
                    accessToken = tokenData.access_token;
                } else {
                    return new Response(JSON.stringify({ error: 'M-Pesa Authentication Failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
            } catch (e) {
                return new Response(JSON.stringify({ error: 'M-Pesa Authentication Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
            const password = btoa(`${shortcode}${passkey}${timestamp}`);

            const stkPayload = {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: 1,
                PartyA: phone_number,
                PartyB: shortcode,
                PhoneNumber: phone_number,
                CallBackURL: callbackUrl,
                AccountReference: plan ? `VIP Subscription` : (order_id ? `Order ${order_id}` : `Event ${event_id}`),
                TransactionDesc: 'Payment'
            };

            const stkResp = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(stkPayload)
            });

            const stkData = await stkResp.json();

            if (stkData.CheckoutRequestID) {
                await supabaseAdmin.from('payments').update({ provider_transaction_id: stkData.CheckoutRequestID }).eq('id', payment.id);
            }

            return new Response(JSON.stringify({
                ...stkData,
                payment_id: payment.id
            }), { status: stkResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
