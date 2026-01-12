
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration in proxy route");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        let objectPath = path.join('/');

        // 1. Handle legacy tokens (i/...) or raw paths
        if (objectPath.startsWith('i/')) {
            // Extract token: i/<token>
            const token = objectPath.substring(2);
            // Token format: payload.signature (we only need encoded payload to find path)
            const parts = token.split('.');
            if (parts.length >= 1) {
                const base64Url = parts[0];
                try {
                    // Base64Url to Base64
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const pad = base64.length % 4;
                    const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
                    const jsonStr = atob(paddedBase64);
                    const data = JSON.parse(jsonStr);
                    if (data.p) {
                        objectPath = data.p;
                    }
                } catch (e) {
                    console.warn("Failed to decode token payload, using path as is:", objectPath);
                }
            }
        }

        // Normalize path to bucket and path
        // Default bucket logic (fallback) or parse from path
        let bucket = 'uploads';
        let cleanPath = objectPath;

        // Check if path starts with bucket name
        if (objectPath.includes('/')) {
            const parts = objectPath.split('/');
            // Check if first part is a known bucket or generic
            // Based on actions.ts: 'uploads' and 'imageBank' are buckets.
            const possibleBucket = parts[0];
            if (possibleBucket === 'uploads' || possibleBucket === 'imageBank' || possibleBucket === 'public') {
                bucket = possibleBucket;
                cleanPath = parts.slice(1).join('/');
            }
        }

        // 2. Generate Signed URL server-side
        // We use createSignedUrl which gives us a URL to fetch from Supabase.
        // NOTE: This URL is time-limited.

        const { data, error } = await supabaseAdmin
            .storage
            .from(bucket)
            .createSignedUrl(cleanPath, 60); // 60 seconds validity for our fetch

        if (error || !data?.signedUrl) {
            console.error("Error signing URL for proxy:", objectPath, error);
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // 3. Fetch object from Supabase
        const response = await fetch(data.signedUrl);

        if (!response.ok) {
            console.error("Upstream fetch failed:", response.status, response.statusText);
            return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
        }

        // 4. Stream response to client
        // Copy relevant headers
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
        console.error("Proxy error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
