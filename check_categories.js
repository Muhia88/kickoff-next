
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzgjyrmhgaukmqdqgqnc.supabase.co';

try {
    // Correct path to supabase/.env relative to this file
    // kickoff-next/check_categories.js -> ../supabase/.env
    const envPath = path.resolve(__dirname, '../supabase/.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const serviceMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
        if (serviceMatch) serviceKey = serviceMatch[1].trim();
    }
} catch (e) { console.error("Env read error", e); }

// Fallback if not found in ../supabase/.env, try local .env.local
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
    console.log("Checking 'categories' table...");
    const { data, error } = await supabase.from('categories').select('id, name');
    if (error) console.error(error);
    else {
        console.log("Categories found:", data.length);
        data.forEach(c => console.log(`- "${c.name}" (ID: ${c.id})`));

        // Specific check for 'Non-Alcoholic & Mixers'
        console.log("\nChecking exact match for 'Non-Alcoholic & Mixers':");
        const { data: exact, error: exactError } = await supabase
            .from('categories')
            .select('*')
            .ilike('name', 'Non-Alcoholic & Mixers'); // Simulate the failing query

        console.log("Result:", exact);
        if (exactError) console.error("Error:", exactError);
    }
}

check();
