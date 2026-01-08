"use client";

import React, { useEffect, useState } from 'react';
import Spinner from '@/components/Spinner';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';

const BrandProductsPage = ({ params }: { params: Promise<{ name: string }> }) => {
    const [brandName, setBrandName] = useState<string | null>(null);
    useEffect(() => {
        params.then(p => setBrandName(decodeURIComponent(p.name)));
    }, [params]);

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!brandName) return;
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Get Brand ID
                const { data: brand, error: brandError } = await supabase
                    .from('brands')
                    .select('id')
                    .ilike('name', brandName)
                    .single();

                if (brandError) throw new Error(`Brand '${brandName}' not found`);

                // Get Products
                const { data, error } = await supabase
                    .from('products')
                    .select('*, product_names(name)') // Join Names
                    .eq('brand_id', brand.id);

                if (error) throw error;
                setProducts(data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [brandName]);

    if (!brandName) return <Spinner />;

    return (
        <div className="bg-gray-50 min-h-screen py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-serif font-bold text-gray-900 uppercase tracking-widest">{brandName}</h1>
                    <div className="w-24 h-1 bg-red-700 mx-auto mt-4"></div>
                </div>

                {loading ? (
                    <div className="flex justify-center"><Spinner /></div>
                ) : error ? (
                    <div className="text-center text-red-600">{error}</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {products.length === 0 ? (
                            <div className="col-span-full text-center text-gray-500">No products found for {brandName}.</div>
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

export default BrandProductsPage;
