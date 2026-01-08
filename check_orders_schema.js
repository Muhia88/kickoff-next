
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzgjyrmhgaukmqdqgqnc.supabase.co';

try {
    const envPath = path.resolve(__dirname, '../supabase/.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const serviceMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
        if (serviceMatch) serviceKey = serviceMatch[1].trim();
    }
} catch (e) { }

if (!serviceKey) {
    try {
        const envPath = path.resolve(__dirname, '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const serviceMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
            if (serviceMatch) serviceKey = serviceMatch[1].trim();
        }
    } catch (e) { }
}

if (!serviceKey) {
    console.error("No service key found!");
    process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function check() {
    console.log("Checking 'orders' table schema via select...");
    const { data, error } = await supabase.from('orders').select('*').limit(1);

    if (error) {
        console.error("Error fetching orders:", error);
    } else {
        if (data.length > 0) {
            console.log("Order columns:", Object.keys(data[0]));
        } else {
            console.log("No orders found to infer columns, trying to insert dummy...");
        }
    }
}

check();
