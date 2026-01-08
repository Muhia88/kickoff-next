"use client";

import React, { useEffect, useState } from 'react';
import Spinner from '@/components/Spinner';
import { supabase } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';

const BrandsPage = () => {
    const [brands, setBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBrands = async () => {
            setLoading(true);
            try {
                // Fetch brands direct from DB
                const { data, error } = await supabase
                    .from('brands')
                    .select('*')
                    .order('name', { ascending: true });

                if (error) throw error;
                setBrands(data || []);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch brands');
            } finally {
                setLoading(false);
            }
        };

        fetchBrands();
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-serif font-bold text-gray-900 uppercase tracking-widest">Our Brands</h1>
                    <div className="w-24 h-1 bg-red-700 mx-auto mt-4"></div>
                </div>

                {loading ? (
                    <div className="flex justify-center"><Spinner /></div>
                ) : error ? (
                    <div className="text-center text-red-600">{error}</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {brands.length === 0 ? (
                            <div className="col-span-full text-center text-gray-500">No brands found.</div>
                        ) : (
                            brands.map(b => (
                                <Link href={`/brand/${b.name}`} key={b.id} className="block group">
                                    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all flex flex-col items-center justify-center text-center h-32">
                                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-red-700">{b.name}</h3>
                                        <p className="text-xs text-gray-500 mt-2">View Products</p>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrandsPage;
