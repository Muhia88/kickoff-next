import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration in ticket image proxy route");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
    request: NextRequest,
    params: { params: Promise<{ eventId: string; uid: string }> } // Note: nested dynamic routes
) {
    try {
        const { eventId, uid } = await params.params;

        if (!eventId || !uid) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // 1. Fetch Ticket details
        // We need to find the ticket by UID and ensure eventId matches (for URL consistency)
        const { data: ticket, error: dbError } = await supabaseAdmin
            .from('tickets')
            .select('qr_object_path, event_id')
            .eq('ticket_uid', uid)
            .single();

        if (dbError || !ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        if (String(ticket.event_id) !== String(eventId)) {
            // Mismatch in URL vs DB, but if UID is unique, maybe loose check?
            // Sticking to strict check for now as the URL structure implies hierarchy.
            return NextResponse.json({ error: 'Ticket does not belong to this event' }, { status: 404 });
        }

        let objectPath = ticket.qr_object_path;

        if (!objectPath) {
            // Fallback: try to construct path if standard naming used
            objectPath = `imageBank/tickets/${eventId}/${uid}.png`;
        }

        // 2. Generate Signed URL
        // Typically stored in 'imageBank' bucket
        // objectPath might include bucket name prefix or not. Standardize.
        let bucket = 'imageBank';
        let cleanPath = objectPath;

        if (cleanPath.startsWith('imageBank/')) {
            cleanPath = cleanPath.replace('imageBank/', '');
        } else if (cleanPath.startsWith('uploads/')) {
            bucket = 'uploads';
            cleanPath = cleanPath.replace('uploads/', '');
        }

        const { data, error } = await supabaseAdmin
            .storage
            .from(bucket)
            .createSignedUrl(cleanPath, 60);

        if (error || !data?.signedUrl) {
            console.error("Error signing URL for ticket QR:", uid, error);
            return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
        }

        // 3. Stream response
        const response = await fetch(data.signedUrl);

        if (!response.ok) {
            return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        const cacheControl = response.headers.get('cache-control') || 'public, max-age=31536000, immutable';

        return new NextResponse(response.body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': cacheControl,
            },
        });

    } catch (err) {
        console.error("Ticket proxy error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
