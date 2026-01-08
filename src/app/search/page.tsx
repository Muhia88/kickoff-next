"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Spinner from '@/components/Spinner';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';

const SearchContent = () => {
    const searchParams = useSearchParams();
    const query = searchParams.get('q');

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!query) {
            setLoading(false);
            return;
        }

        const fetchProducts = async () => {
            setLoading(true);
            setError(null);
            try {
                const results = await Promise.all([
                    // 1. Search by Product Name (joined table)
                    supabase
                        .from('products')
                        .select('*, product_names!inner(name)')
                        .ilike('product_names.name', `%${query}%`)
                        .limit(50), // Limit to avoid massive payloads

                    // 2. Search by Category Name (joined table)
                    supabase
                        .from('products')
                        .select('*, product_names(name), categories!inner(name)')
                        .ilike('categories.name', `%${query}%`)
                        .limit(50),

                    // 3. Search by Description (main table)
                    supabase
                        .from('products')
                        .select('*, product_names(name)')
                        .ilike('description', `%${query}%`)
                        .limit(50)
                ]);

                // Check for errors in any of the requests
                const errors = results.filter(r => r.error).map(r => r.error?.message);
                if (errors.length > 0) {
                    console.error("Search errors:", errors);
                    // We continue if at least one query succeeded, or show generic error if all failed?
                    // For improved DX, let's treat it as success if we get ANY data, but log errors.
                }

                // Merge and deduplicate
                const allItems = results.flatMap(r => r.data || []);
                const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());

                setProducts(uniqueItems);
            } catch (err: any) {
                console.error("Exception searching:", err);
                setError('An unexpected error occurred while searching.');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [query]);

    if (!query) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-gray-500">
                <p className="text-xl">Please enter a search term to find products.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 border-b pb-4">
                    <h1 className="text-3xl font-bold text-gray-900 font-serif">
                        Search Results for <span className="text-red-700">"{query}"</span>
                    </h1>
                    <p className="text-gray-600 mt-2">{products.length} result(s) found</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
                        <p className="text-gray-500">Searching specifically for "{query}"...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-center">
                        {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {products.length === 0 ? (
                            <div className="col-span-full py-16 text-center">
                                <h2 className="text-2xl font-semibold text-gray-800 mb-2">No matches found</h2>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    We couldn't find any products, brands, or categories matching "{query}".
                                    Try checking your spelling or using more general terms.
                                </p>
                            </div>
                        ) : (
                            products.map(p => (
                                <ProductCard key={p.id} product={p} />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const SearchPage = () => {
    return (
        <Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}>
            <SearchContent />
        </Suspense>
    );
}

export default SearchPage;
