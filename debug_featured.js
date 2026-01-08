
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Try to load service key
try {
    const envPath = path.resolve(__dirname, '../supabase/.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
    if (match) {
        serviceKey = match[1].trim();
    }
} catch (e) {
    // console.log("Manual load failed");
}

if (!serviceKey) {
    console.log("No service key found.");
    process.exit(1);
}

const URL = 'https://pzgjyrmhgaukmqdqgqnc.supabase.co';
const supabase = createClient(URL, serviceKey);

async function check() {
    console.log("Checking 'Featured Items' category...");

    // 1. Get Category ID
    const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Featured Items')
        .single();

    if (catError || !catData) {
        console.error("Could not find 'Featured Items' category:", catError);
        return;
    }

    console.log("Category ID:", catData.id);

    // 2. Check Products in this category
    const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', catData.id);

    if (prodError) {
        console.error("Error fetching products:", prodError);
    } else {
        console.log(`Found ${prodData.length} products in 'Featured Items'.`);
        if (prodData.length === 0) {
            console.log("Assigning a random product to 'Featured Items' to fix 406...");

            // Assign one product
            const { data: rando } = await supabase.from('products').select('id').limit(1).single();
            if (rando) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ category_id: catData.id })
                    .eq('id', rando.id);

                if (updateError) console.log("Update failed:", updateError);
                else console.log("Updated product", rando.id, "to be in Featured Items.");
            }
        }
    }
}

check();
