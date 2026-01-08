
const { createClient } = require('@supabase/supabase-js');

// Config from kickoff-next next.config.ts and env
const URL = 'https://pzgjyrmhgaukmqdqgqnc.supabase.co';
// Using ANON KEY
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z2p5cm1oZ2F1a21xZHFncW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDc0NDAsImV4cCI6MjA3NDkyMzQ0MH0.t0eHxZmxPeQ-NOw8O1F6yNcNDBQtWgH4DycEvuKNtpk';

const supabase = createClient(URL, ANON_KEY);

async function testProducts() {
    console.log("Testing Products Fetch...");

    // 1. Direct Table Query
    console.log("1. Direct Table Query (RLS Check):");
    const { data: tableData, error: tableError } = await supabase
        .from('products')
        .select('id, name, image_url, category_id')
        .limit(5);

    if (tableError) {
        console.error("Link Table Error:", tableError);
    } else {
        console.log("Table Success. Count:", tableData.length);
        if (tableData.length > 0) console.log("Sample:", tableData[0]);
    }

    // 2. Edge Function Query
    console.log("\n2. Edge Function Query (Legacy API emulation):");
    const { data: funcData, error: funcError } = await supabase.functions.invoke('products', {
        method: 'GET'
    });

    if (funcError) {
        console.error("Edge Function Error:", funcError);
    } else {
        console.log("Function Success. Type:", Array.isArray(funcData) ? "Array" : typeof funcData);
        if (Array.isArray(funcData)) {
            console.log("Count:", funcData.length);
            if (funcData.length > 0) console.log("Sample:", funcData[0]);
        } else {
            console.log("Data:", funcData);
        }
    }
}

testProducts();
