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
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

export async function getSignedImageURL(path: string | null | undefined) {
    if (!path) return { signedUrl: null, error: "No path provided" };

    try {
        // 1. Clean the path.
        let cleanPath = path.replace(/^\/+/, '');

        // 2. Determine Bucket and Path
        let bucket = 'uploads'; // Default

        if (cleanPath.startsWith('uploads/')) {
            cleanPath = cleanPath.substring(8);
        } else if (cleanPath.startsWith('imageBank/')) {
            bucket = 'imageBank';
            cleanPath = cleanPath.substring(10);
        }

        // 3. Create Signed URL
        const { data, error } = await supabaseAdmin
            .storage
            .from(bucket)
            .createSignedUrl(cleanPath, 60 * 60);

        if (error) {
            console.error("Error signing URL:", error);
            return { signedUrl: null, error: error.message };
        }

        return { signedUrl: data.signedUrl };
    } catch (e: any) {
        console.error("Exception signing URL:", e);
        return { signedUrl: null, error: e.message || "Unknown exception" };
    }
}

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
