"use client";

import { useEffect, useState } from 'react';

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

        // Simple proxy logic: 
        // If http/data, use as is.
        // Else, append to /api/images/
        if (path.startsWith('http') || path.startsWith('data:')) {
            setImgSrc(path);
            setIsLoading(false);
            return;
        }

        // Clean leading slashes
        const cleanPath = path.replace(/^\/+/, '');
        setImgSrc(`/api/images/${cleanPath}`);
        // We let the img tag's onLoad/onError handle loading state for the proxy url
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
