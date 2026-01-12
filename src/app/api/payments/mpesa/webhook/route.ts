
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
            .select('id, order_id, status')
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

            if (payment.order_id) {
                await supabaseAdmin.from('orders').update({
                    status: 'paid'
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
