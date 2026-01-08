
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load Keys
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzgjyrmhgaukmqdqgqnc.supabase.co';

try {
    const envPath = path.resolve(__dirname, '../supabase/.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const serviceMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
    if (serviceMatch) serviceKey = serviceMatch[1].trim();

    const anonMatch = envContent.match(/SUPABASE_ANON_KEY=(.*)/); // Usually in .env or .env.local
    if (anonMatch) anonKey = anonMatch[1].trim();
} catch (e) { }

// Fallback for Anon Key if not in supabase/.env (it might be there or not)
if (!anonKey) {
    // Try kickoff-next .env.local
    try {
        const localEnv = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
        const match = localEnv.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
        if (match) anonKey = match[1].trim();
    } catch (e) { }
}

if (!serviceKey || !anonKey) {
    console.log("Missing keys. Service:", !!serviceKey, "Anon:", !!anonKey);
    // Hardcoded fallback from previous context if needed, but better to fail if not found
}

const supabaseAdmin = createClient(url, serviceKey);
const supabaseAnon = createClient(url, anonKey);

async function check() {
    console.log("--- RLS DIAGNOSTIC ---");

    // 1. Admin Check (Bypasses RLS)
    const { data: adminRaw, error: adminError } = await supabaseAdmin.from('products').select('count', { count: 'exact', head: true });
    if (adminError) console.error("Admin Fetch Error:", adminError);
    else console.log("Total Products (Admin):", adminRaw);

    // 2. Anon Check (Subject to RLS)
    const { data: anonData, error: anonError } = await supabaseAnon.from('products').select('id, name').limit(3);
    if (anonError) {
        console.error("ANON Fetch Error (RLS BLOCKING?):", anonError);
    } else {
        console.log("Anon Fetch Success. Count:", anonData.length);
        if (anonData.length === 0) console.log("WARNING: Anon fetch returned 0 items. RLS might be hiding them.");
        else console.log("Sample:", anonData[0]);
    }

    // 3. Category Check
    const { data: cats, error: catError } = await supabaseAnon.from('categories').select('id, name');
    if (catError) console.error("Anon Category Error:", catError);
    else console.log("Anon Categories:", cats ? cats.length : 0);

    // 4. Featured Items specific check
    const { data: featuredCat } = await supabaseAnon.from('categories').select('id').eq('name', 'Featured Items').single();
    if (featuredCat) {
        const { data: featProd } = await supabaseAnon.from('products').select('id').eq('category_id', featuredCat.id);
        console.log(`Products in 'Featured Items' (Anon): ${featProd ? featProd.length : 0}`);
    } else {
        console.log("Featured Items category not found via Anon.");
    }
}

check();
