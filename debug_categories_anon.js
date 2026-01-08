
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzgjyrmhgaukmqdqgqnc.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z2p5cm1oZ2F1a21xZHFncW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDc0NDAsImV4cCI6MjA3NDkyMzQ0MH0.t0eHxZmxPeQ-NOw8O1F6yNcNDBQtWgH4DycEvuKNtpk';

const supabase = createClient(url, anonKey);

async function check() {
    console.log("Checking Categories as ANON...");
    const { data, error } = await supabase.from('categories').select('*').eq('name', 'Featured Items');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Categories found:", data);
        if (data.length === 0) console.log("RLS might be hiding 'Featured Items'");
    }
}

check();
