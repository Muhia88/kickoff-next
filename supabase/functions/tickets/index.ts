
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
                    // If we can't find the user, we can't link the ticket properly in DB (if FK)
                    // Fallback or Throw? Throwing is safer.
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
                    const dataUrl = await QRCode.toDataURL(verifyUrl);
                    const base64Data = dataUrl.split(',')[1];
                    const binaryString = atob(base64Data);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let k = 0; k < len; k++) bytes[k] = binaryString.charCodeAt(k);

                    const fileName = `tickets/${event_id}/${uid}.png`;

                    const { error: uploadError } = await supabaseAdmin.storage
                        .from('imageBank')
                        .upload(fileName, bytes, { contentType: 'image/png', upsert: true });

                    if (!uploadError) {
                        qrPath = `imageBank/${fileName}`;
                        const { data: signedData } = await supabaseAdmin.storage
                            .from('imageBank')
                            .createSignedUrl(fileName, 31536000); // 1 year
                        if (signedData) qrUrl = signedData.signedUrl;
                    } else {
                        console.error("QR Upload Error", uploadError);
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
                    status: 'valid'
                };
                // Note: tickets table might not have qr_code_url column? Previous code inserted qr_code: qrDataURL in variable 'tickets' but 'itemsToInsert' had `qrPath`?
                // Step 1171 code had 2 blocks (one with itemsToInsert, other with tickets.push).
                // I will match the structure that uses 'itemsToInsert' which seemed more complete in Step 1171 listing.
                // It used: user_id, event_id, price, ticket_uid, purchased_at, qr_object_path.

                itemsToInsert.push(ticket);
                tickets.push({ ...ticket, qr_code_url: qrUrl }); // return URL to frontend
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

            try {
                const qrUid = crypto.randomUUID();
                const qrContent = JSON.stringify({ order_id: order_id, uid: qrUid });
                const dataUrl = await QRCode.toDataURL(qrContent);
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
                    // Update Order Metadata
                    const { data: currentOrder } = await supabaseAdmin.from('orders').select('metadata').eq('id', order_id).single();
                    // Merge Metadata
                    const newMeta = {
                        ...(currentOrder?.metadata || {}),
                        qr_object_path: `imageBank/${fileName}`
                    };

                    // Update Order
                    const { error: updateError } = await supabaseAdmin.from('orders')
                        .update({
                            metadata: newMeta,
                            qr_code: `imageBank/${fileName}` // Some legacy using 'qr_code' column? Step 1171 code used 'qr_code' for link?
                            // Step 1171 had 'qr_code: qrCodeUrl' in one block and 'qr_image_url' in another.
                            // I will update BOTH 'qr_code' (likely text/path) and 'qr_image_url' if column exists.
                            // Better: Set 'qr_code' to the signed URL or Path?
                            // Standard: 'qr_code' column in orders seems to store URL or Path.
                            // I'll set 'qr_code' to Path (consistent with metadata).
                        })
                        .eq('id', order_id);

                    if (updateError) throw updateError;

                    return new Response(JSON.stringify({ message: 'Order QR created' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
