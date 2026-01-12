"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    // We can't throw here comfortably if build time checks run this file, 
    // but we should log. The component checking it will fail gracefully.
    console.error("Missing Supabase env vars for signing in actions.ts");
}

// Initialize Supabase with Service Role Key for Admin privileges (signing URLs)
console.log("Initializing Supabase Admin in actions.ts");
console.log("Supabase URL:", supabaseUrl);
console.log("Service Key Prefix:", supabaseServiceKey?.substring(0, 10));

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);



export async function uploadAvatar(formData: FormData) {
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
        throw new Error("File and User ID are required");
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be less than 5MB");
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;

    try {
        const fileBuffer = await file.arrayBuffer();

        const { data, error } = await supabaseAdmin
            .storage
            .from('uploads')
            .upload(fileName, fileBuffer, {
                contentType: file.type,
                upsert: true
            });

        if (error) throw error;

        return fileName;

    } catch (err: any) {
        console.error("Upload error:", err);
        throw new Error(err.message || "Failed to upload image");
    }
}
