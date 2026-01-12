import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
    request: NextRequest,
    params: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params.params;

        if (!id) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }

        // 1. Fetch Order details
        const { data: order, error: dbError } = await supabaseAdmin
            .from('orders')
            .select('metadata, qr_image_url')
            .eq('id', id)
            .single();

        if (dbError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        let objectPath: string | null = null;

        // Try metadata first
        if (order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)) {
            // @ts-ignore
            objectPath = order.metadata.qr_object_path;
        }

        // Fallback: If no object path in metadata, parse it from qr_image_url (legacy)
        if (!objectPath && order.qr_image_url) {
            const url = order.qr_image_url;
            if (url.includes('imageBank/')) {
                objectPath = url.substring(url.indexOf('imageBank/'));
            } else if (url.includes('orders/')) {
                objectPath = `imageBank/${url}`; // Guessing logic
            }
        }

        if (!objectPath) {
            // Fallback: try standard naming
            // We'd need to know the UID... which we don't.
            // But if we can't find path, we can't serve it.
            return NextResponse.json({ error: 'QR path not found' }, { status: 404 });
        }

        // 2. Generate Signed URL
        let bucket = 'imageBank';
        let cleanPath = objectPath;

        if (cleanPath.startsWith('imageBank/')) {
            cleanPath = cleanPath.replace('imageBank/', '');
        }

        const { data, error } = await supabaseAdmin
            .storage
            .from(bucket)
            .createSignedUrl(cleanPath, 60);

        if (error || !data?.signedUrl) {
            console.error("Error signing URL for order QR:", id, error);
            return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
        }

        // 3. Stream response
        const response = await fetch(data.signedUrl);
        if (!response.ok) {
            return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
        }

        return new NextResponse(response.body, {
            status: 200,
            headers: {
                'Content-Type': response.headers.get('content-type') || 'image/png',
                'Cache-Control': response.headers.get('cache-control') || 'public, max-age=31536000, immutable',
            },
        });

    } catch (err) {
        console.error("Order proxy error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
