
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';



export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("M-Pesa Webhook Received:", JSON.stringify(body));

        const { stkCallback } = body;
        if (!stkCallback) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

        // Supabase Admin Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must be set in Vercel Env
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Find Payment
        const { data: payment } = await supabaseAdmin
            .from('payments')
            // Try matching by CheckoutRequestID (Provider Transaction ID)
            .select('id, order_id, status, raw_payload, amount') // Select raw_payload and amount
            .eq('provider_transaction_id', CheckoutRequestID)
            .single();

        if (!payment) {
            console.error("Payment not found for CheckoutRequestID:", CheckoutRequestID);
            return NextResponse.json({ message: "Payment ignored (not found)" }, { status: 200 });
        }

        if (payment.status === 'success') {
            return NextResponse.json({ message: "Already processed" });
        }

        if (ResultCode === 0) {
            // Success
            // Extract M-Pesa Receipt Number if needed
            const mpesaReceiptItem = CallbackMetadata?.Item?.find((i: any) => i.Name === 'MpesaReceiptNumber');
            const receiptNumber = mpesaReceiptItem?.Value;

            await supabaseAdmin.from('payments').update({
                status: 'success',
                raw_payload: body,
                provider_transaction_id: receiptNumber || CheckoutRequestID
            }).eq('id', payment.id);

            // 1. Event Ticket Logic (Decoupled from Orders)
            if (payment.raw_payload?.event_id) {
                const { event_id, quantity, user_id } = payment.raw_payload;

                // Call Tickets Edge Function
                const ticketsUrl = `${supabaseUrl}/functions/v1/tickets`;
                try {
                    await fetch(ticketsUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'create_tickets',
                            event_id: event_id,
                            user_id: user_id,
                            quantity: quantity || 1
                            // payment_reference: payment.id
                        })
                    });
                } catch (e) {
                    console.error("Failed to invoke tickets function from webhook:", e);
                }

            }
            // 3. VIP Subscription Logic
            else if (payment.raw_payload?.plan === 'vip') {
                const { user_id } = payment.raw_payload;
                const subsUrl = `${supabaseUrl}/functions/v1/subscriptions`;
                try {
                    await fetch(subsUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'activate',
                            user_id: user_id,
                            payment_id: payment.id
                        })
                    });
                } catch (e) {
                    console.error("Failed to invoke subscriptions function:", e);
                }
            }
            // 2. Standard Order Logic
            else if (payment.order_id) {
                // Fetch the order to get current metadata
                const { data: orderData } = await supabaseAdmin
                    .from('orders')
                    .select('metadata')
                    .eq('id', payment.order_id)
                    .single();

                // Parse metadata safely
                let currentMeta = orderData?.metadata || {};
                if (typeof currentMeta === 'string') {
                    try {
                        currentMeta = JSON.parse(currentMeta);
                    } catch (e) {
                        console.error("Failed to parse order metadata", e);
                        currentMeta = {};
                    }
                }

                // Generate QR code for order
                const qrUid = crypto.randomUUID();
                const friendlyUrl = `https://theearlykickoff.co.ke/api/images/order/${payment.order_id}`;
                const objectPath = `orders/${payment.order_id}/${qrUid}.png`;

                // Upload QR Code to Supabase Storage
                try {
                    // Import QRCode dynamically or use a simple approach
                    // Since we're in Next.js API route, we can use qrcode package
                    const QRCode = require('qrcode');
                    const verifyUrl = `https://theearlykickoff.co.ke/verify-order/${payment.order_id}`;

                    const dataUrl = await QRCode.toDataURL(verifyUrl, {
                        type: 'image/png',
                        width: 300,
                        margin: 2
                    });

                    // Convert Base64 to Buffer
                    const base64Data = dataUrl.split(',')[1];
                    const buffer = Buffer.from(base64Data, 'base64');

                    const { error: uploadError } = await supabaseAdmin.storage
                        .from('imageBank')
                        .upload(objectPath, buffer, { contentType: 'image/png', upsert: true });

                    if (uploadError) {
                        console.error("Failed to upload order QR:", uploadError);
                    }
                } catch (qrError) {
                    console.error("Failed to generate order QR:", qrError);
                }

                // Update order with paid status and QR URL
                await supabaseAdmin.from('orders').update({
                    status: 'paid',
                    qr_image_url: friendlyUrl,
                    qr_code: friendlyUrl,
                    metadata: {
                        ...currentMeta,
                        qr_object_path: `imageBank/${objectPath}`
                    }
                }).eq('id', payment.order_id);
            }

            return NextResponse.json({ message: "Payment processed successfully" });

        } else {
            // Failure (User Cancelled, Insufficient Funds, etc)
            await supabaseAdmin.from('payments').update({
                status: 'failed',
                raw_payload: body
            }).eq('id', payment.id);

            return NextResponse.json({ message: "Payment marked as failed" });
        }

    } catch (error: any) {
        console.error("Webhook Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
