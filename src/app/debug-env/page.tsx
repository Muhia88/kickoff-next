import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function DebugEnvPage() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not Set';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'Not Set';
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let signResult = 'Not attempted';
    let signError = null;
    let listBucketsResult = 'Not attempted';
    let listBucketsError = null;

    if (service && url) {
        try {
            const supabaseAdmin = createClient(url, service);

            // Test 1: List Buckets
            const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
            if (bucketError) {
                listBucketsResult = 'Failed: ' + bucketError.message;
                listBucketsError = bucketError;
            } else {
                listBucketsResult = `Success (${buckets?.length} buckets found)`;
            }

            // Test 2: Sign URL
            const { data, error } = await supabaseAdmin
                .storage
                .from('uploads')
                .createSignedUrl('test-debug.jpg', 60);

            if (error) {
                signResult = 'Failed';
                signError = error.message;
            } else {
                signResult = 'Success';
            }
        } catch (e: any) {
            signResult = 'Exception';
            signError = e.message;
            listBucketsResult = 'Exception: ' + e.message;
        }
    }

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4">Environment Debug</h1>

            <div className="mb-4">
                <strong>Supabase URL:</strong> {url}
            </div>

            <div className="mb-4">
                <strong>Service Role Key:</strong><br />
                Defined: {service ? 'YES' : 'NO'}<br />
                Length: {service?.length}<br />
                Start: {service?.substring(0, 10)}...<br />
                End: ...{service?.substring(service && service.length > 10 ? service.length - 10 : 0)}
            </div>

            <div className="mb-4 p-4 bg-gray-100 rounded">
                <strong>Test 1: List Buckets (Connectivity):</strong><br />
                Result: <span className={listBucketsResult.startsWith('Success') ? 'text-green-600' : 'text-red-600'}>{listBucketsResult}</span><br />
            </div>

            <div className="mb-4 p-4 bg-gray-100 rounded">
                <strong>Test 2: Signing (Server Side):</strong><br />
                Result: <span className={signResult === 'Success' ? 'text-green-600' : 'text-red-600'}>{signResult}</span><br />
                {signError && <div className="text-red-600">Error: {signError}</div>}
            </div>

            <p className="text-gray-500 mt-8">
                If 'List Buckets' works but 'Signing' fails, the Service Role Key is valid but might lack permission or the bucket is private/restricted differently.
                If both fail, the Key or URL is likely invalid or network is blocked.
            </p>
        </div>
    );
}
