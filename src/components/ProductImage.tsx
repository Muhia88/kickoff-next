"use client";

import { useEffect, useState } from 'react';

import { LoadingSpinner } from './LoadingSpinner';
import { ImageOff } from 'lucide-react';

interface ProductImageProps {
    path: string | null | undefined;
    alt: string;
    className?: string;
    productId?: number; // Optional for friendly URLs
    eventId?: number;   // Optional for friendly event URLs
}

export default function ProductImage({ path, alt, className, productId, eventId }: ProductImageProps) {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        // Reset state when path changes
        setHasError(false);
        setIsLoading(true);
        setImgSrc(null);

        // Priority 1: Friendly URL via Product ID
        if (productId) {
            setImgSrc(`/api/images/product/${productId}`);
            // We let the img tag's onLoad/onError handle loading state for the proxy url
            return;
        }

        // Priority 2: Friendly URL via Event ID
        if (eventId) {
            setImgSrc(`/api/images/event/${eventId}`);
            return;
        }

        // If no ID, fall back to path logic
        if (!path) {
            setHasError(true);
            setIsLoading(false);
            return;
        }

        // Simple proxy logic for path:
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
    }, [path, productId, eventId]);

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
