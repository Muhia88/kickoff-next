"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Star, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UseCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import ProductImage from '@/components/ProductImage';
import Spinner from '@/components/Spinner';
import ProductCard from '@/components/ProductCard';

const ProductPage = ({ params }: { params: Promise<{ id: string }> }) => {
    const router = useRouter();
    const { addToCart, setShowCart } = UseCart();
    const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();

    // Unwrap params
    const [productId, setProductId] = useState<string | null>(null);
    useEffect(() => {
        params.then(p => setProductId(p.id));
    }, [params]);

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    const [quantity, setQuantity] = useState(1);
    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Fetch Product
    useEffect(() => {
        if (!productId) return;
        const fetchProduct = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*, product_names(name)')
                    .eq('id', productId)
                    .single();

                if (error) throw error;
                setProduct(data);
                setProduct(data);

                // Load suggestions (random or by category)
                if (data.category_id) {
                    const { data: suggs } = await supabase
                        .from('products')
                        .select('*, product_names(name)')
                        .eq('category_id', data.category_id)
                        .neq('id', data.id)
                        .limit(4);
                    setSuggestions(suggs || []);
                }

            } catch (err: any) {
                setError(err.message || 'Failed to fetch product');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId]);

    const handleAdd = () => {
        if (!product) return;
        if (product.stock !== undefined && product.stock <= 0) {
            alert("This item is out of stock.");
            return;
        }
        addToCart({ ...product, quantity });
        setShowCart(true);
    };

    const handleWishlist = () => {
        if (!product) return;
        if (isWishlisted(product.id)) {
            removeFromWishlist(product.id);
        } else {
            addToWishlist(product);
        }
    };

    const formatToKES = (price: any) => {
        if (price == null) return '';
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Number(price));
    };

    if (loading) return <div className="py-20 text-center"><Spinner /></div>;
    if (error) return <div className="py-20 text-center text-red-600">{error}</div>;
    if (!product) return <div className="py-20 text-center">Product not found.</div>;

    const liked = isWishlisted(product.id);

    return (
        <div className="bg-white">
            <div className="pt-6 pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-10 gap-x-12 xl:gap-x-16 items-start">

                        {/* Image */}
                        <div className="flex flex-col items-center">
                            <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden flex items-center justify-center aspect-square border border-gray-200 relative">
                                <ProductImage
                                    path={product.image || product.image_url}
                                    alt={product.name || product.product_names?.name}
                                    className="w-full h-full object-contain p-4"
                                />
                                {/* Sale Badge */}
                                {product.sale && (
                                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 text-sm font-bold rounded">SALE</div>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex flex-col justify-start">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl font-serif">
                                {product.name || product.product_names?.name}
                            </h1>

                            <div className="mt-4">
                                <p className="text-3xl tracking-tight text-gray-900 font-bold">
                                    {formatToKES(product.price)}
                                </p>
                                {product.originalPrice && (
                                    <p className="text-lg text-gray-500 line-through mt-1">
                                        {formatToKES(product.originalPrice)}
                                    </p>
                                )}
                            </div>

                            <div className="mt-6">
                                <p className="text-base text-gray-700 leading-relaxed">{product.description}</p>
                            </div>

                            {/* Stock & Actions */}
                            <div className="mt-10">
                                <div className="mb-4">
                                    {product.stock !== undefined && product.stock <= 0 ? (
                                        <p className="text-sm font-medium text-red-600">Out of Stock</p>
                                    ) : (
                                        <p className="text-sm font-bold text-green-600">In Stock</p>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-900 mb-2">Quantity</label>
                                    <div className="flex items-center border border-gray-300 rounded w-fit">
                                        <button
                                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                            className="px-4 py-2 hover:bg-gray-100 border-r"
                                            disabled={quantity <= 1}
                                        >-</button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                                            className="w-16 text-center focus:outline-none p-2 text-gray-900"
                                        />
                                        <button
                                            onClick={() => setQuantity(q => q + 1)}
                                            className="px-4 py-2 hover:bg-gray-100 border-l"
                                        >+</button>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={handleAdd}
                                        disabled={product.stock !== undefined && product.stock <= 0}
                                        className="flex-1 bg-gray-900 text-white py-3 px-8 rounded-md font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart size={20} />
                                        Add to Cart
                                    </button>
                                    <button
                                        onClick={handleWishlist}
                                        className={`w-full sm:w-auto px-4 py-3 border rounded-md font-medium flex items-center justify-center gap-2 transition-colors ${liked ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        <Heart size={20} className={liked ? 'fill-current' : ''} />
                                        {liked ? 'Saved' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            {suggestions.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                    <h2 className="text-2xl font-bold font-serif mb-6">You might also like</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {suggestions.map(s => (
                            <ProductCard key={s.id} product={s} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductPage;
