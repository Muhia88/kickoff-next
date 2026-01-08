
const { createClient } = require('@supabase/supabase-js');

const url = 'https://pzgjyrmhgaukmqdqgqnc.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z2p5cm1oZ2F1a21xZHFncW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM0NzQ0MCwiZXhwIjoyMDc0OTIzNDQwfQ.z3z7_ShVBWGBSfPWtAkOmDscOg7xSugu9iK4lgVXsfM';

const supabase = createClient(url, serviceKey);

async function checkImages() {
    console.log("Fetching product image URLs...");
    const { data, error } = await supabase.from('products').select('id, image_url').limit(10);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Sample Image URLs:");
        data.forEach(p => console.log(`ID ${p.id}: ${p.image_url}`));
    }
}

checkImages();
