import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration in product image proxy route");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
    request: NextRequest,
    params: { params: Promise<{ id: string }> } // Correct type for Next.js 15+ dynamic routes
) {
    try {
        const { id } = await params.params; // Next.js params is a Promise in newer versions

        if (!id) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        // 1. Fetch Product Image URL from Database
        const { data: product, error: dbError } = await supabaseAdmin
            .from('products')
            .select('image_url')
            .eq('id', id)
            .single();

        if (dbError || !product || !product.image_url) {
            console.error("Product or image not found:", id, dbError);
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        let objectPath = product.image_url;

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
                    console.warn("Failed to decode token payload in product proxy, using path as is:", objectPath);
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

        // If the path is a full URL (legacy artifact?), try to extract path
        if (objectPath.startsWith('http')) {
            try {
                const url = new URL(objectPath);
                const pathParts = url.pathname.split('/');
                // typical path: /storage/v1/object/public/bucket/path...
                const storageIndex = pathParts.indexOf('storage');
                if (storageIndex !== -1 && pathParts[storageIndex + 2] === 'object') {
                    // /storage/v1/object/public/bucket/file... or /storage/v1/object/authenticated/bucket/file...
                    // The bucket is at index + 4 (if public/authenticated is present) or we just split after 'object'
                    // Simplest: take everything after the bucket name if we can identify it.
                    // Let's rely on standard logic: normally stored as relative paths.
                    // If it is absolute, this proxy might not be needed or we just redirect?
                    // For security, strict proxying of relative paths is better. 
                    // If we encounter a full URL, we might just want to redirect to it?
                    // No, requirement is to hide Supabase URLs.
                    // If it's a supabase URL, parse key.
                }
            } catch (e) {
                // ignore
            }
        }

        // 3. Generate Signed URL
        const { data, error } = await supabaseAdmin
            .storage
            .from(bucket)
            .createSignedUrl(cleanPath, 60);

        if (error || !data?.signedUrl) {
            console.error("Error signing URL for product proxy:", id, objectPath, error);
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
        console.error("Product proxy error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
