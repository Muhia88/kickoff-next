
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
    console.log("Checking Categories...");
    const { data, error } = await supabase.from('categories').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Categories:", data.map(c => c.name));
        const featured = data.find(c => c.name === 'Featured Items');
        if (featured) {
            console.log("Found 'Featured Items' ID:", featured.id);
            // Check products in this category
            const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category_id', featured.id);
            console.log("Products in Featured Items:", count);
        } else {
            console.log(" 'Featured Items' category NOT FOUND.");
        }
    }
}

check();
