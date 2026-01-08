
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
    console.log("--- SCHEMA CHECK ---");

    // 1. Join Check verify product_names
    console.log("Checking Product Join:");
    const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('id, name_id, product_names(name)')
        .limit(1);

    if (prodError) {
        console.log("Join Error:", prodError.message);
        // Fallback check: list columns of product_names
        const { data: cols } = await supabase.from('product_names').select('*').limit(1);
        console.log("Product Names Sample:", cols);
    } else {
        console.log("Join Success:", JSON.stringify(prodData, null, 2));
    }

    // 2. Events Check
    console.log("\nChecking Events Table:");
    const { data: evData, error: evError } = await supabase.from('events').select('*').limit(1);
    if (evError) console.error("Events Error:", evError);
    else console.log("Event Sample:", evData ? evData[0] : "No events");
}

check();
