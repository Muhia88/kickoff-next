
const { createClient } = require('@supabase/supabase-js');

const url = 'https://pzgjyrmhgaukmqdqgqnc.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z2p5cm1oZ2F1a21xZHFncW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDc0NDAsImV4cCI6MjA3NDkyMzQ0MH0.t0eHxZmxPeQ-NOw8O1F6yNcNDBQtWgH4DycEvuKNtpk';

const supabase = createClient(url, anonKey);

const sampleUrl = "/i/eyJwIjoidXBsb2Fkcy9qb2huLWJhcnItcmVkLTc1MG1sLWU3Zjg4MGFjOTFkZTQ1Y2ViOTkzODc2YmZiZWE4MzJhLndlYnAiLCJleHAiOjE5MTg1NzcxMDh9.ARR8Z59He_jAiGZ-Phitf6YNQERmciVWplNor_Nhg5A";

function testEncode(str) {
    const tokenMatch = str.match(/^\/?i\/([^.]+)/);
    if (!tokenMatch) {
        console.log("No match");
        return;
    }
    const token = tokenMatch[1];
    console.log("Token:", token);

    // URL safe base64 to standard base64
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    console.log("Base64:", base64);

    // Padding?
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    console.log("Padded:", padded);

    const jsonStr = Buffer.from(padded, 'base64').toString('utf-8');
    console.log("JSON:", jsonStr);

    const data = JSON.parse(jsonStr);
    console.log("Data:", data);

    if (data.p) {
        const cleanPath = data.p.replace(/^uploads\//, '');
        console.log("Clean path:", cleanPath);
        const { data: pubData } = supabase.storage.from("uploads").getPublicUrl(cleanPath);
        console.log("Public URL:", pubData.publicUrl);
    }
}

testEncode(sampleUrl);
