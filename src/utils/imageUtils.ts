import { supabase } from "@/lib/supabase";

// Hardcoded for now based on typical setup, or use env var
const IMAGEKIT_ID = process.env.NEXT_PUBLIC_IMAGEKIT_ID || 'kickoff';
// Note: If you have a specific ID like 'ik.imagekit.io/your_id', extract it.
// Assuming 'kickoff' based on typical naming or we can use Supabase storage as fallback,
// but the token clearly points to 'uploads/...'.
// If the user's old backend used ImageKit, we should use ImageKit to serve these if possible,
// OR we can try to find them in Supabase Storage if they were migrated there.
// The user said "images urls are stored as base 64 in the supabase database".
// The decoded path is "uploads/..."
// If we migrated assets to Supabase Storage "uploads" bucket, we should use Supabase Public URL.
// Let's try Supabase Public URL first as per previous plan.

export const getProductImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return "/caribia-gin-250ml.png"; // Fallback default image

    // 1. Absolute URL check
    if (imagePath.startsWith("http")) {
        return imagePath;
    }

    // 2. Local asset check
    if (imagePath.startsWith("/")) {
        // Only if it doesn't look like /i/... which is our special token
        if (!imagePath.startsWith("/i/")) return imagePath;
    }

    // 3. Decode legacy /i/ tokens OR just base64 strings
    // Format seen: i/eyJwIjoi... or /i/eyJw...
    const tokenMatch = imagePath.match(/^\/?i\/([^.]+)/); // Stop at dot if signature exists
    if (tokenMatch) {
        try {
            const token = tokenMatch[1];
            // Fix padding for URL-safe base64
            let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
            const padHandler = base64.length % 4;
            if (padHandler) {
                base64 += '='.repeat(4 - padHandler);
            }

            const jsonStr = atob(base64);
            const data = JSON.parse(jsonStr);

            if (data.p) {
                // data.p often includes 'uploads/', but bucket 'getPublicUrl' appends it too if we assume root.
                const cleanPath = data.p.replace(/^uploads\//, '');
                const { data: publicUrlData } = supabase.storage.from("uploads").getPublicUrl(cleanPath);
                return publicUrlData.publicUrl;
            }
        } catch (e) {
            console.warn("Failed to decode token:", imagePath, e);
        }
    }

    // 4. Fallback: Treat as direct path in Supabase Storage
    const cleanPath = imagePath.replace(/^uploads\//, '');
    const { data } = supabase.storage.from("uploads").getPublicUrl(cleanPath);
    return data.publicUrl;
};
