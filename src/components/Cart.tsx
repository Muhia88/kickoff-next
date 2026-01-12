"use client";

import React, { useRef, useEffect } from 'react';
import { X, Trash2, ShoppingCart, Minus, Plus } from 'lucide-react';
import { UseCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductImage from './ProductImage';

const Cart = () => {
    const {
        cartItems: items,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalPrice,
        showCart,
        setShowCart
    } = UseCart();
    const { user } = useAuth();

    const router = useRouter();
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowCart(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [setShowCart]);

    // Close on outside click
    const handleOutsideClick = (e: React.MouseEvent) => {
        if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
            setShowCart(false);
        }
    };

    const handleCheckout = () => {
        setShowCart(false);
        if (!user) {
            router.push('/signin');
            return;
        }
        router.push('/checkout');
    };

    return (
        <div
            className={`fixed inset-0 z-[60] transition-all duration-300 ${showCart ? 'visible opacity-100' : 'invisible opacity-0'
                }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={() => setShowCart(false)}
            />

            {/* Sidebar */}
            <aside
                ref={sidebarRef}
                className={`absolute top-0 right-0 h-full w-full sm:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 flex flex-col ${showCart ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
                    <h3 className="text-2xl font-serif font-bold text-gray-900">Your Cart</h3>
                    <button
                        onClick={() => setShowCart(false)}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-4">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                <ShoppingCart size={40} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-gray-900 mb-1">Your cart is empty</h4>
                                <p className="text-gray-500">Looks like you haven't added anything yet.</p>
                            </div>
                            <button
                                onClick={() => setShowCart(false)}
                                className="mt-4 px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
                            >
                                Start Shopping
                            </button>
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {items.map((item) => (
                                <li key={item.id} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                                    <div className="w-20 h-20 bg-gray-50 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                                        <ProductImage path={item.image_url} alt={item.name} className="h-full w-full object-cover" productId={item.id} />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                                            <p className="text-sm font-medium text-gray-500 mt-1">
                                                KSh {item.price.toLocaleString()}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 h-8">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="px-3 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg transition-colors"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="w-8 text-center text-sm font-bold text-gray-900 bg-white border-x border-gray-200 h-full flex items-center justify-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="px-3 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg transition-colors"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-gray-500 font-medium">Subtotal</span>
                            <span className="text-2xl font-bold text-gray-900">KSh {totalPrice.toLocaleString()}</span>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleCheckout}
                                className="w-full bg-red-700 text-white py-4 rounded-xl font-bold hover:bg-red-800 transition-all shadow-lg hover:shadow-red-700/20 active:scale-[0.98]"
                            >
                                Checkout
                            </button>
                            <button
                                onClick={clearCart}
                                className="w-full py-3 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors"
                            >
                                Clear Cart
                            </button>
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
};

export default Cart;
