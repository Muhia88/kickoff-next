
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import QRCode from "https://esm.sh/qrcode@1.5.3"

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

        // Get current user from Auth
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        // Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Resolve Integer User ID (Get or Create / Fix Profile)
        let { data: profile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('supabase_id', user.id)
            .single()

        // Profile Upsert/Repair Logic
        const now = new Date().toISOString();
        const meta = user.user_metadata || {};

        const updates: any = {
            supabase_id: user.id,
            email: user.email,
            username: meta.username || user.email?.split('@')[0],
            full_name: meta.full_name || meta.name || 'User',
            phone: meta.phone || null,
            updated_at: now,
            is_email_confirmed: !!user.email_confirmed_at,
            is_phone_confirmed: !!user.phone_confirmed_at,
            avatar_url: meta.avatar_url || meta.picture || null,
            metadata: meta,
            address: meta.address || null
        };

        let shouldUpdate = false;
        if (!profile) {
            shouldUpdate = true;
            updates.role = 'user';
            updates.status = 'pending';
            updates.created_at = now;
        } else {
            if (!profile.created_at) { updates.created_at = now; shouldUpdate = true; }
            if (profile.role === 'customer' || !profile.role) { updates.role = 'user'; shouldUpdate = true; }
            if (!profile.metadata) { shouldUpdate = true; }
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            const { data: updatedProfile, error: upsertError } = await supabaseAdmin
                .from('users')
                .upsert(updates, { onConflict: 'supabase_id' })
                .select('id, phone')
                .single();

            if (upsertError) {
                console.error("Failed to upsert profile:", upsertError);
                if (!profile) throw new Error('User profile creation failed: ' + upsertError.message);
            } else {
                profile = updatedProfile;
            }
        }

        const userId = profile.id
        const url = new URL(req.url)
        const path = url.pathname

        // GET /orders/me
        if (req.method === 'GET' && (path.endsWith('/me') || path.endsWith('/orders/me'))) {
            const { data: orders, error: ordersError } = await supabaseAdmin
                .from('orders')
                .select(`
            *,
            items:order_items(
                *,
                product:products(name, image_url),
                event:events(name, image_url),
                merchandise:merchandise(name, image_url)
            ),
            shipping_address:shipping_addresses(*)
         `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            if (ordersError) throw ordersError

            return new Response(JSON.stringify({ orders }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // POST /orders (Create Order)
        if (req.method === 'POST') {
            const body = await req.json()
            const { items, metadata: clientMeta, source } = body

            if (!items || !items.length) throw new Error("No items provided");

            // Calculate total and validate items
            let totalPrice = 0;
            const validItems = [];

            for (const item of items) {
                let price = 0;
                if (item.product_id) {
                    const { data: p } = await supabaseAdmin.from('products').select('price').eq('id', item.product_id).single();
                    if (p) price = p.price;
                } else if (item.merchandise_id) {
                    const { data: m } = await supabaseAdmin.from('merchandise').select('price').eq('id', item.merchandise_id).single();
                    if (m) price = m.price;
                } else if (item.event_id) {
                    const { data: e } = await supabaseAdmin.from('events').select('price').eq('id', item.event_id).single();
                    if (e) price = e.price;
                }
                totalPrice += price * item.quantity;
                validItems.push({ ...item, price });
            }

            // Shipping fee
            const shippingFee = (clientMeta?.shipping_method === 'ship') ? 199 : 0;
            totalPrice += shippingFee;

            // Construct Metadata
            const orderType = validItems.some(i => i.event_id) ? 'event' : 'store';
            const finalMetadata = {
                ...clientMeta,
                total_price: totalPrice,
                order_type: orderType,
                shipping_fee: shippingFee,
                shipping_address: clientMeta?.pinned_location || null
            };

            // Insert Order
            const { data: order, error: orderError } = await supabaseAdmin
                .from('orders')
                .insert({
                    user_id: userId,
                    status: 'pending',
                    metadata: finalMetadata,
                    source: source || 'web'
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Separate Items Logic
            const itemsToInsert = [];
            const ticketsToInsert = [];

            for (const i of validItems) {
                if (i.event_id) {
                    // Event -> Create Tickets (One per quantity)
                    for (let q = 0; q < i.quantity; q++) {
                        const uid = crypto.randomUUID();

                        // Generate QR Code
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

                            const fileName = `tickets/${i.event_id}/${uid}.png`;
                            // Upload to Storage
                            const { error: uploadError } = await supabaseAdmin.storage
                                .from('imageBank')
                                .upload(fileName, bytes, { contentType: 'image/png', upsert: true });

                            if (!uploadError) {
                                qrPath = `imageBank/${fileName}`;
                                // Try Signed URL (1 year)
                                const { data: signedData } = await supabaseAdmin.storage
                                    .from('imageBank')
                                    .createSignedUrl(fileName, 31536000);
                                if (signedData) qrUrl = signedData.signedUrl;
                            } else {
                                console.error("QR Upload Error", uploadError);
                            }
                        } catch (e) {
                            console.error("QR Generation Error", e);
                        }

                        ticketsToInsert.push({
                            user_id: userId,
                            event_id: i.event_id,
                            price: i.price,
                            ticket_uid: uid,
                            purchased_at: new Date().toISOString(),
                            qr_object_path: qrPath,
                            qr_code_url: qrUrl
                        });
                    }
                } else {
                    // Product/Merch -> Create Order Items
                    itemsToInsert.push({
                        order_id: order.id,
                        product_id: i.product_id || null,
                        merchandise_id: i.merchandise_id || null,
                        quantity: i.quantity
                    });
                }
            }

            // Insert Product/Merch Items
            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabaseAdmin.from('order_items').insert(itemsToInsert);
                if (itemsError) {
                    await supabaseAdmin.from('orders').delete().eq('id', order.id);
                    throw itemsError;
                }
            }

            // Insert Tickets
            if (ticketsToInsert.length > 0) {
                const { error: ticketsError } = await supabaseAdmin.from('tickets').insert(ticketsToInsert);
                if (ticketsError) {
                    await supabaseAdmin.from('orders').delete().eq('id', order.id);
                    throw ticketsError;
                }
            }

            // Generate Order QR (PNG)
            try {
                // Use order_uuid if available, else random. Actually order_uuid exists on order model but we just inserted it.
                // The insert returns 'order', let's check if it has uuid. Typically UUID is gen by default.
                // We'll use order.id for simplicity in file path, but check if we want a UUID for the filename.
                // Revert to using a random UID for the file to avoid guessing, but path should be predictable?
                // Actually the plan said friendly URL: /api/images/order/[id]. 
                // The proxy will need to look up the path. So path doesn't strictly need to be friendly, but clean.

                const qrUid = crypto.randomUUID();
                const verifyUrl = `https://theearlykickoff.co.ke/verify-order/${order.id}`;

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

                const fileName = `orders/${order.id}/${qrUid}.png`;

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('imageBank')
                    .upload(fileName, bytes, { contentType: 'image/png', upsert: true });

                if (!uploadError) {
                    // Friendly URL
                    const friendlyUrl = `https://theearlykickoff.co.ke/api/images/order/${order.id}`;

                    await supabaseAdmin.from('orders')
                        .update({
                            qr_image_url: friendlyUrl,
                            qr_code: friendlyUrl,
                            metadata: {
                                ...(order.metadata || {}),
                                qr_object_path: `imageBank/${fileName}`
                            }
                        })
                        .eq('id', order.id);
                } else {
                    console.error("Order QR Upload Error", uploadError);
                }
            } catch (e) {
                console.error("Order QR Gen Error", e);
            }

            return new Response(JSON.stringify({
                order_id: order.id,
                total_price: totalPrice,
                message: 'Order created'
            }), {
                status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // GET /orders/:id
        const segments = path.split('/')
        const lastSeg = segments[segments.length - 1]
        const orderId = !isNaN(Number(lastSeg)) ? Number(lastSeg) : null

        if (req.method === 'GET' && orderId) {
            const { data: order, error: orderError } = await supabaseAdmin
                .from('orders')
                .select(`
                *,
                items:order_items(
                    *,
                    product:products(name, image_url),
                    event:events(name, image_url),
                    merchandise:merchandise(name, image_url)
                ),
                shipping_address:shipping_addresses(*)
            `)
                .eq('id', orderId)
                .single();

            if (orderError) throw orderError
            if (order.user_id !== userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: corsHeaders })

            return new Response(JSON.stringify(order), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
