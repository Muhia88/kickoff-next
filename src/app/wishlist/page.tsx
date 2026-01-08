"use client";

import { useWishlist } from "@/context/WishlistContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { Heart } from "lucide-react";

interface Product {
    id: number;
    name: string;
    product_names?: { name: string };
    price: number;
    originalPrice?: number;
    image_url?: string;
    image?: string;
    description?: string;
    stock?: number;
    rating?: number;
    reviews?: number;
    sale?: boolean;
    discount?: string;
}

export default function WishlistPage() {
    const { wishlistItems } = useWishlist();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWishlist = async () => {
            if (wishlistItems.length === 0) {
                setProducts([]);
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*, product_names(name)')
                    .in('id', wishlistItems);

                if (error) {
                    console.error("Error fetching wishlist:", error);
                }

                if (data) {
                    setProducts(data);
                }
            } catch (err) {
                console.error("Exception fetching wishlist:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchWishlist();
    }, [wishlistItems]);

    // Cleanup products that were removed from wishlist but might still be in state if we don't re-fetch
    // Actually, dependency on [wishlistItems] handles re-fetch, but for instant UI update on removal?
    // If I unlike an item ON the wishlist page, it triggers re-fetch.
    // However, if the fetch is slow, the UI might lag.
    // Better: Filter `products` by `wishlistItems` immediately for display.
    const displayedProducts = products.filter(p => wishlistItems.includes(p.id));

    if (loading && products.length === 0) {
        return (
            <div className="w-full bg-white min-h-[60vh]">
                <div className="container mx-auto px-4 py-16 text-center">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 w-1/4 mx-auto rounded"></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="aspect-square bg-gray-200 rounded-lg" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (wishlistItems.length === 0) {
        return (
            <div className="w-full bg-white min-h-[60vh] flex items-center justify-center">
                <div className="container mx-auto px-4 flex flex-col items-center justify-center">
                    <div className="bg-gray-50 p-6 rounded-full mb-6">
                        <Heart size={48} className="text-gray-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-black mb-2 font-serif">Your Wishlist is Empty</h1>
                    <p className="text-gray-600 mb-8 max-w-md text-center">
                        Looks like you haven't added any items to your wishlist yet.
                        Browse our premium collection and click the heart icon to save your favorites.
                    </p>
                    <Link
                        href="/"
                        className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors uppercase tracking-wide border border-black"
                    >
                        Start Shopping
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white min-h-[70vh]">
            <div className="container mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold mb-8 text-center md:text-left text-black font-serif">My Wishlist ({displayedProducts.length})</h1>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                    {displayedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );
}
