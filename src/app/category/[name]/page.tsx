"use client";

import React, { useEffect, useState } from 'react';
import Spinner from '@/components/Spinner';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';

const CategoryPage = ({ params }: { params: Promise<{ name: string }> }) => {
    // Unwrap params
    const [categoryName, setCategoryName] = useState<string | null>(null);
    useEffect(() => {
        params.then(p => setCategoryName(decodeURIComponent(p.name)));
    }, [params]);

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!categoryName) return;

        const fetchProducts = async () => {
            setLoading(true);
            setError(null);
            try {
                // Find category ID first? Or products by category name if joined?
                // Supabase doesn't support recursive joins deeply in client easily without select string syntax
                // "products!inner(..., category!inner(name))"
                // But easier: Get Category ID -> Get Products

                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .select('id')
                    .ilike('name', categoryName)
                    .single(); // ilike for case insensitive

                if (catError) throw new Error(`Category '${categoryName}' not found`);

                const { data, error } = await supabase
                    .from('products')
                    .select('*, product_names(name)')
                    .eq('category_id', catData.id);

                if (error) throw error;
                setProducts(data || []);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch products');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [categoryName]);

    if (!categoryName) return <Spinner />;

    return (
        <div className="bg-gray-50 min-h-screen py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-serif font-bold text-gray-900 uppercase tracking-widest">{categoryName}</h1>
                    <div className="w-24 h-1 bg-red-700 mx-auto mt-4"></div>
                </div>

                {loading ? (
                    <div className="flex justify-center"><Spinner /></div>
                ) : error ? (
                    <div className="text-center text-red-600">
                        {error.includes("not found") ? "Category not found." : error}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {products.length === 0 ? (
                            <div className="col-span-full text-center text-gray-500">No products found in this category.</div>
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

export default CategoryPage;
