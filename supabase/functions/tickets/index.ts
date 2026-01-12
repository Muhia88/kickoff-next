
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
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        // Use Service Role for DB writes (tickets table, storage)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { action, event_id, user_id, quantity, order_id } = await req.json();

        if (action === 'create_tickets') {
            if (!event_id || !user_id) {
                return new Response(JSON.stringify({ error: 'Missing event_id or user_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            console.log(`Creating tickets for Event ${event_id}, User ${user_id}`);

            // Resolve User ID (UUID -> Int)
            let dbUserId = user_id;
            if (typeof user_id === 'string' && user_id.length > 30) {
                const { data: uVal, error: uErr } = await supabaseAdmin.from('users').select('id').eq('supabase_id', user_id).maybeSingle();
                if (uVal) {
                    dbUserId = uVal.id;
                } else {
                    console.error("User lookup failed for tickets:", user_id, uErr);
                    throw new Error("User record not found for Ticket generation");
                }
            }

            const qty = quantity || 1;
            const itemsToInsert = [];
            const tickets = [];

            // Fetch Event Price
            const { data: event, error: eventError } = await supabaseAdmin.from('events').select('*').eq('id', event_id).single();

            if (eventError || !event) throw new Error("Event not found");

            const unitPrice = Number(event?.ticket_price || event?.price || 0);

            for (let q = 0; q < qty; q++) {
                const uid = crypto.randomUUID();
                let qrPath = null;
                let qrUrl = null;

                try {
                    const verifyUrl = `https://theearlykickoff.co.ke/api/tickets/verify/${uid}`;

                    // Generate PNG Data URL
                    const dataUrl = await QRCode.toDataURL(verifyUrl, {
                        type: 'image/png',
                        width: 300,
                        margin: 2
                    });

                    // Convert Base64 to Uint8Array
                    const base64Data = dataUrl.split(',')[1];
                    const binaryString = atob(base64Data);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    const fileName = `tickets/${event_id}/${uid}.png`;

                    const { error: uploadError } = await supabaseAdmin.storage
                        .from('imageBank')
                        .upload(fileName, bytes, { contentType: 'image/png', upsert: true });

                    if (!uploadError) {
                        qrPath = `imageBank/${fileName}`;
                        // Friendly URL format: /api/images/ticket/<event_id>/<uid>
                        qrUrl = `https://theearlykickoff.co.ke/api/images/ticket/${event_id}/${uid}`;
                    } else {
                        console.error("QR Upload Error", uploadError);
                        // We continue even if QR upload fails, ticket is created without QR (better than no ticket)
                    }

                } catch (e) {
                    console.error("QR Gen/Upload Error", e);
                }

                const ticket = {
                    user_id: dbUserId,
                    event_id: event_id,
                    price: unitPrice,
                    ticket_uid: uid,
                    purchased_at: new Date().toISOString(),
                    qr_object_path: qrPath,
                    ticket_uid: uid,
                    purchased_at: new Date().toISOString(),
                    qr_object_path: qrPath,
                    qr_code_url: qrUrl, // Persist friendly URL to DB
                    is_used: false
                };

                itemsToInsert.push(ticket);
                // For client response, ensure we send the friendly URL
                tickets.push({ ...ticket, qr_code_url: qrUrl });
            }

            if (itemsToInsert.length > 0) {
                const { error: insertError } = await supabaseAdmin.from('tickets').insert(itemsToInsert);
                if (insertError) {
                    console.error("Ticket Insert Error", insertError);
                    throw insertError;
                }
            }

            return new Response(JSON.stringify({
                message: 'Tickets created successfully',
                tickets: tickets
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        else if (action === 'create_order_qr') {
            if (!order_id) {
                return new Response(JSON.stringify({ error: 'Missing order_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            console.log(`Generating QR for Order ${order_id}`);

            // Fetch Order
            const { data: order, error: orderError } = await supabaseAdmin
                .from('orders')
                .select('*')
                .eq('id', order_id)
                .single();

            if (orderError || !order) throw new Error("Order not found");

            // Skip if qr_image_url already set with friendly URL format
            if (order.qr_image_url && order.qr_image_url.includes('/api/images/order/')) {
                return new Response(JSON.stringify({ message: 'Order QR already exists', qr_image_url: order.qr_image_url }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            try {
                const qrUid = crypto.randomUUID();
                const verifyUrl = `https://theearlykickoff.co.ke/verify-order/${order_id}`;

                // Generate PNG Data URL
                const dataUrl = await QRCode.toDataURL(verifyUrl, {
                    type: 'image/png',
                    width: 300,
                    margin: 2
                });

                // Convert Base64 to Uint8Array
                const base64Data = dataUrl.split(',')[1];
                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let k = 0; k < len; k++) bytes[k] = binaryString.charCodeAt(k);

                const fileName = `orders/${order_id}/${qrUid}.png`;
                const { error: uploadError } = await supabaseAdmin.storage
                    .from('imageBank')
                    .upload(fileName, bytes, { contentType: 'image/png', upsert: true });

                if (!uploadError) {
                    // Friendly URL
                    const friendlyUrl = `https://theearlykickoff.co.ke/api/images/order/${order_id}`;

                    // Parse metadata safely
                    let currentMeta = order.metadata || {};
                    if (typeof currentMeta === 'string') {
                        try {
                            currentMeta = JSON.parse(currentMeta);
                        } catch (e) {
                            console.error("Failed to parse metadata", e);
                            currentMeta = {};
                        }
                    }

                    // Update Order
                    const { error: updateError } = await supabaseAdmin.from('orders')
                        .update({
                            metadata: {
                                ...currentMeta,
                                qr_object_path: `imageBank/${fileName}`
                            },
                            qr_image_url: friendlyUrl,
                            qr_code: friendlyUrl
                        })
                        .eq('id', order_id);

                    if (updateError) throw updateError;

                    return new Response(JSON.stringify({ message: 'Order QR created', qr_image_url: friendlyUrl }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                } else {
                    throw uploadError;
                }
            } catch (err: any) {
                console.error("Order QR Error", err);
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error("Tickets Function Error", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
