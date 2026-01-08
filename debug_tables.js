
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzgjyrmhgaukmqdqgqnc.supabase.co';

try {
    const envPath = path.resolve(__dirname, '../supabase/.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const serviceMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
    if (serviceMatch) serviceKey = serviceMatch[1].trim();
} catch (e) { }

const supabase = createClient(url, serviceKey);

async function check() {
    console.log("Listing tables in 'public' schema...");
    // A bit hacky to list tables via PostgREST if not exposed, but we can tryrpc or just query standard tables if we knew them.
    // Actually, we can use the `rpc` if we have a function, or just query a known table.
    // Better: use the edge function 'setup_policies' I made earlier? No, it's write-only ish.
    // I check standard tables I suspect:
    const candidates = ['names', 'product_names', 'item_names', 'titles'];
    for (const t of candidates) {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (!error) console.log(`Found table: ${t}`);
        else console.log(`Not found: ${t}`, error.code);
    }
}

check();
