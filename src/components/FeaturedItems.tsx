"use client";

import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import Spinner from './Spinner';
import { supabase } from '@/lib/supabase';

const FeaturedItems = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch products that are in the 'Featured Items' category
                // Assuming there is a categories table and products have a category_id
                // We filter by joining with categories



                // Fetch Featured Items (skip top 1 which is Product Of The Week)
                const { data, error: prodError } = await supabase
                    .from('featured_items')
                    .select('product:products(*, product_names(name))')
                    .order('position', { ascending: false })
                    .range(1, 6); // Get next 6 items

                if (prodError) throw prodError;

                // Flatten
                const items = (data || []).map((f: any) => f.product).filter(Boolean);
                setProducts(items);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    return (
        <section id="featured-items" className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-serif font-bold text-center mb-12 text-gray-800">
                    Popular Items
                </h2>

                {loading ? (
                    <div className="text-center text-gray-500"><Spinner /></div>
                ) : error ? (
                    <div className="text-center text-red-500">Error loading products</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {products.length === 0 ? (
                            <div className="col-span-full text-center text-gray-500">No featured items found.</div>
                        ) : (
                            products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default FeaturedItems;
