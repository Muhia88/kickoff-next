"use client";

import React from 'react';
import { Heart, Star } from 'lucide-react';
import { UseCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import Link from 'next/link';
import ProductImage from './ProductImage';

const formatToKES = (price: any) => {
    if (price === null || price === undefined || price === '') return '';
    const numeric = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.-]+/g, '')) : Number(price);
    if (Number.isNaN(numeric)) return '';

    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numeric);
};

const renderStars = (rating = 0) => {
    return Array.from({ length: 5 }, (_, i) => (
        <Star
            key={i}
            size={12}
            className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
        />
    ));
};

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

const ProductCard = ({ product, loading = false }: { product?: Product, loading?: boolean }) => {
    const { addToCart, setShowCart } = UseCart();
    const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();

    if (loading) {
        return (
            <div className="group relative">
                <div className="aspect-square bg-white rounded-lg overflow-hidden mb-4">
                    <div className="bg-gray-200 animate-pulse w-full h-full rounded" />
                </div>
                <div className="space-y-2">
                    <div className="bg-gray-200 animate-pulse h-4 w-3/4 rounded" />
                    <div className="flex items-center space-x-2">
                        <div className="bg-gray-200 animate-pulse h-3 w-20 rounded" />
                        <div className="bg-gray-200 animate-pulse h-3 w-12 rounded" />
                    </div>
                    <div className="bg-gray-200 animate-pulse h-8 w-full mt-2 rounded" />
                </div>
            </div>
        );
    }

    if (!product) return null;

    // Resolve name from product_names if direct name is missing
    const productName = product.name || product.product_names?.name || 'Untitled Product';

    const handleAdd = () => {
        if (product.stock !== undefined && product.stock <= 0) {
            alert("This item is out of stock.");
            return;
        }
        addToCart({ ...product, name: productName, quantity: 1 });
        setShowCart(true);
    };

    const liked = isWishlisted(product.id);
    const handleWishlist = (e: React.MouseEvent) => {
        // ... same wishlist logic ...
        e.preventDefault();
        e.stopPropagation();
        if (liked) {
            removeFromWishlist(product.id);
        } else {
            addToWishlist({ ...product, name: productName });
        }
    };



    return (
        <div className="group relative cursor-pointer">
            <Link href={`/product/${product.id}`} className="block">
                {/* Sale Badge */}
                {product.sale && product.discount && (
                    <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-xs px-2 py-1 font-medium rounded shadow-lg">
                        Save {formatToKES(product.discount)}
                    </div>
                )}

                {/* Wishlist */}
                <button
                    className="absolute top-2 right-2 z-10 p-2 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all"
                    onClick={handleWishlist}
                    aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                    <Heart size={16} className={liked ? 'text-red-600' : 'text-gray-600'} />
                </button>

                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4 relative">
                    <ProductImage
                        path={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        productId={product.id}
                    />
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">{productName}</h3>

                    {(Number(product.reviews) > 0) && (
                        <div className="flex items-center space-x-1">
                            <div className="flex space-x-1">{renderStars(product.rating)}</div>
                            <span className="text-xs text-gray-500">({product.reviews})</span>
                        </div>
                    )}

                    <div className="flex items-center space-x-2">
                        {product.originalPrice && (
                            <span className="text-sm text-gray-500 line-through">{formatToKES(product.originalPrice)}</span>
                        )}
                        <span className="text-lg font-bold text-gray-900">{formatToKES(product.price)}</span>
                    </div>
                </div>
            </Link>
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdd(); }}
                className={`w-full text-white py-2 text-sm font-medium transition-colors duration-200 mt-2 ${product.stock !== undefined && product.stock <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'}`}
                disabled={product.stock !== undefined && product.stock <= 0}
            >
                {product.stock !== undefined && product.stock <= 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
            </button>
        </div>
    );
};

export default ProductCard;
