"use client";

import { useEffect, useState } from 'react';
import { getSignedImageURL } from '@/app/actions';
import { LoadingSpinner } from './LoadingSpinner';
import { ImageOff } from 'lucide-react';

interface ProductImageProps {
    path: string | null | undefined;
    alt: string;
    className?: string;
    fill?: boolean; // Support next/image fill prop if we were using it, but here we use standard img for now to match admin simple logic, OR we can try to use Next Image if desired.
    // For now, sticking to standard <img> for consistency with admin fix, unless optimization dictates otherwise.
    // Actually, kickoff-next uses Next Image in some places. 
    // BUT, standard <img> is safer for dynamic signed URLs to avoid Next.js Image Optimization caching issues with signed params?
    // Let's use standard <img> for now, as it worked for admin.
}

export default function ProductImage({ path, alt, className }: ProductImageProps) {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        // Reset state when path changes
        setHasError(false);
        setIsLoading(true);
        setImgSrc(null);

        if (!path) {
            setHasError(true);
            setIsLoading(false);
            return;
        }

        const fetchImage = async () => {
            try {
                // If it's already a full URL (legacy or external), use it
                if (path.startsWith('http') || path.startsWith('data:')) {
                    setImgSrc(path);
                    return;
                }

                // Clean path like 'uploads/products/...' -> 'products/...'
                let resolvePath = path.replace(/^\/+/, '');

                // Handle legacy tokens (i/...)
                const tokenMatch = path.match(/^\/?i\/([^.]+)/);
                if (tokenMatch) {
                    try {
                        let base64 = tokenMatch[1].replace(/-/g, '+').replace(/_/g, '/');
                        const pad = base64.length % 4;
                        if (pad) base64 += '='.repeat(4 - pad);

                        const jsonStr = atob(base64);
                        const data = JSON.parse(jsonStr);
                        if (data.p) {
                            resolvePath = data.p;
                        }
                    } catch (e) {
                        console.warn('Failed to decode token, trying path as is:', path);
                    }
                }

                // Call server action to sign URL
                const response = await getSignedImageURL(resolvePath);

                if (response && response.signedUrl) {
                    setImgSrc(response.signedUrl);
                } else {
                    console.error("Failed to sign URL for path:", resolvePath, "Error:", response?.error);
                    setHasError(true);
                    setIsLoading(false);
                }
            } catch (e) {
                console.error("Error loading image:", e);
                setHasError(true);
                setIsLoading(false);
            }
        };

        fetchImage();
    }, [path]);

    return (
        <div className={`relative ${className} overflow-hidden`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <LoadingSpinner />
                </div>
            )}
            {!hasError && imgSrc && (
                <img
                    src={imgSrc}
                    alt={alt}
                    className={`block w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                />
            )}
            {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                    <ImageOff size={24} />
                </div>
            )}
        </div>
    );
}
