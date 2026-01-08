"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface WishlistContextType {
    wishlistItems: number[]; // Store IDs
    addToWishlist: (product: any) => void;
    removeFromWishlist: (id: number) => void;
    isWishlisted: (id: number) => boolean;
}

const WishlistContext = createContext<WishlistContextType>({
    wishlistItems: [],
    addToWishlist: () => { },
    removeFromWishlist: () => { },
    isWishlisted: () => false,
});

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
    const [wishlistItems, setWishlistItems] = useState<number[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('wishlist');
            if (saved) {
                try {
                    setWishlistItems(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse wishlist", e);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
        }
    }, [wishlistItems]);

    const addToWishlist = (product: any) => {
        setWishlistItems((prev) => {
            if (prev.includes(product.id)) return prev;
            return [...prev, product.id];
        });
    };

    const removeFromWishlist = (id: number) => {
        setWishlistItems((prev) => prev.filter((itemId) => itemId !== id));
    };

    const isWishlisted = (id: number) => wishlistItems.includes(id);

    return (
        <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, isWishlisted }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => useContext(WishlistContext);
