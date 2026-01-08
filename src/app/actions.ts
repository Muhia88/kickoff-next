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
    if (!path) return null;

    try {
        // 1. Clean the path.
        // Ensure no leading slashes
        let cleanPath = path.replace(/^\/+/, '');

        // Remove 'uploads/' prefix if present, as createSignedUrl expects path relative to bucket root?
        // Wait, in admin_backend logic, it splits bucket 'uploads' from path.
        // If path is 'uploads/products/xyz.jpg', and bucket is 'uploads', then object path is 'products/xyz.jpg'.
        // The legacy logic: bucket, object_name = object_path.split('/', 1) -> implies path starts with bucket.
        // Let's support both. If it starts with 'uploads/', strip it.
        // 2. Determine Bucket and Path
        let bucket = 'uploads'; // Default

        if (cleanPath.startsWith('uploads/')) {
            cleanPath = cleanPath.substring(8);
        } else if (cleanPath.startsWith('imageBank/')) {
            bucket = 'imageBank';
            cleanPath = cleanPath.substring(10); // 'imageBank/'.length
        }

        // 3. Create Signed URL
        const { data, error } = await supabaseAdmin
            .storage
            .from(bucket)
            .createSignedUrl(cleanPath, 60 * 60); // 1 hour expiry

        if (error) {
            console.error("Error signing URL:", error);
            return null;
        }

        return data.signedUrl;
    } catch (e) {
        console.error("Exception signing URL:", e);
        return null;
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
