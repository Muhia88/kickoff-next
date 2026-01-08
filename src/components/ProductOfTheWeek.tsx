"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Spinner from './Spinner';
import { supabase } from '@/lib/supabase';
import ProductImage from './ProductImage';

const ProductOfTheWeek = () => {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                setError(null);

                // Similar logic to Featured Items, but get 1 item.
                // It seems the original code also filtered by 'Featured Items' and took the first one?
                // "const data = await productsService.getProducts({ category: 'Featured Items', per_page: 1 });"



                // Fetch Top Featured Item
                const { data, error } = await supabase
                    .from('featured_items')
                    .select('product:products(*, product_names(name))')
                    .order('position', { ascending: false })
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                // Flatten structure: data.product is the product object
                setProduct(data?.product || null);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, []);

    if (loading) {
        return (
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center text-gray-500"><Spinner /></div>
                </div>
            </section>
        );
    }

    if (error || !product) {
        // Hide section if no product
        return null;
    }



    return (
        <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div>
                            <span className="text-sm text-gray-500 uppercase tracking-wider">TRENDING THIS WEEK</span>
                            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-800 mt-2">{product.name || product.product_names?.name}</h2>
                        </div>

                        <p className="text-gray-600 leading-relaxed">{product.description}</p>

                        <button
                            className="bg-gray-900 text-white px-8 py-3 text-sm font-medium uppercase tracking-wider hover:bg-gray-800 transition-colors duration-200"
                            onClick={() => router.push(`/product/${product.id}`)}
                        >
                            SHOP NOW
                        </button>
                    </div>

                    <div className="relative">
                        <div className="bg-white rounded-lg p-8">
                            <div className="relative w-full h-96 max-w-sm mx-auto">
                                <div className="relative w-full h-96 max-w-sm mx-auto">
                                    <ProductImage
                                        path={product.image_url || product.image}
                                        alt={product.name || product.product_names?.name}
                                        className="object-contain w-full h-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProductOfTheWeek;
