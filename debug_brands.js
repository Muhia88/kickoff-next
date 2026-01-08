
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
    console.log("Checking 'brands' table...");
    const { data, error } = await supabase.from('brands').select('*').limit(1);

    if (error) console.log("Brands Error:", error.message);
    else console.log("Brands Sample:", data ? data[0] : 'No brands');
}

check();
