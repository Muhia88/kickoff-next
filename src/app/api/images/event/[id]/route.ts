import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration in event image proxy route");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
    request: NextRequest,
    params: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params.params;

        if (!id) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        // 1. Fetch Event Image URL from Database
        const { data: event, error: dbError } = await supabaseAdmin
            .from('events')
            .select('image_url')
            .eq('id', id)
            .single();

        if (dbError || !event || !event.image_url) {
            console.error("Event or image not found:", id, dbError);
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        let objectPath = event.image_url;

        // 2. Resolve Path (similar logic to the generalized proxy)
        // Handle legacy tokens (i/...)
        if (objectPath.startsWith('i/') || objectPath.startsWith('/i/')) {
            const token = objectPath.replace(/^\/?i\//, '');
            const parts = token.split('.');
            if (parts.length >= 1) {
                const base64Url = parts[0];
                try {
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const pad = base64.length % 4;
                    const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
                    const jsonStr = atob(paddedBase64);
                    const data = JSON.parse(jsonStr);
                    if (data.p) {
                        objectPath = data.p;
                    }
                } catch (e) {
                    console.warn("Failed to decode token payload in event proxy, using path as is:", objectPath);
                }
            }
        }

        // Normalize bucket and path
        let bucket = 'uploads';
        let cleanPath = objectPath;

        // Handle leading slashes
        cleanPath = cleanPath.replace(/^\/+/, '');

        if (cleanPath.includes('/')) {
            const parts = cleanPath.split('/');
            const possibleBucket = parts[0];
            if (possibleBucket === 'uploads' || possibleBucket === 'imageBank' || possibleBucket === 'public') {
                bucket = possibleBucket;
                cleanPath = parts.slice(1).join('/');
            }
        }

        if (objectPath.startsWith('http')) {
            // Handle http paths if necessary same as product proxy
        }

        // 3. Generate Signed URL
        const { data, error } = await supabaseAdmin
            .storage
            .from(bucket)
            .createSignedUrl(cleanPath, 60);

        if (error || !data?.signedUrl) {
            console.error("Error signing URL for event proxy:", id, objectPath, error);
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // 4. Stream response
        const response = await fetch(data.signedUrl);

        if (!response.ok) {
            return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const cacheControl = response.headers.get('cache-control') || 'public, max-age=31536000, immutable';

        return new NextResponse(response.body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': cacheControl,
            },
        });

    } catch (err) {
        console.error("Event proxy error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
