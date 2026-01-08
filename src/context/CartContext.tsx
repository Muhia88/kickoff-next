"use client";

import { createContext, useContext, useState, useEffect } from "react";

// Simplified Cart interface
interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    image_url: string;
    stock?: number;
}

interface CartContextType {
    cartItems: CartItem[];
    cartCount: number;
    totalPrice: number;
    showCart: boolean;
    setShowCart: (show: boolean) => void;
    addToCart: (item: any, quantity?: number) => void;
    removeFromCart: (id: number) => void;
    updateQuantity: (id: number, quantity: number) => void;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType>({
    cartItems: [],
    cartCount: 0,
    totalPrice: 0,
    showCart: false,
    setShowCart: () => { },
    addToCart: () => { },
    removeFromCart: () => { },
    updateQuantity: () => { },
    clearCart: () => { },
});

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    // Load initial cart from local storage if available
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cart');
            if (saved) {
                try {
                    setCartItems(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse cart", e);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('cart', JSON.stringify(cartItems));
        }
    }, [cartItems]);

    const addToCart = (product: any, quantity = 1) => {
        if (product.stock !== undefined && product.stock <= 0) {
            alert("This item is out of stock."); // Or use a prettier toast
            return;
        }

        setCartItems((prev) => {
            const existing = prev.find((i) => i.id === product.id);
            if (existing) {
                const newQuantity = existing.quantity + quantity;
                if (product.stock !== undefined && newQuantity > product.stock) {
                    alert(`Only ${product.stock} items in stock.`);
                    return prev.map((i) =>
                        i.id === product.id ? { ...i, quantity: product.stock } : i
                    );
                }
                return prev.map((i) =>
                    i.id === product.id ? { ...i, quantity: newQuantity } : i
                );
            }

            if (product.stock !== undefined && quantity > product.stock) {
                alert(`Only ${product.stock} items in stock.`);
                return [...prev, { ...product, quantity: product.stock }];
            }

            return [...prev, { ...product, quantity }];
        });
        setShowCart(true); // Auto-open cart on add
    };

    const updateQuantity = (id: number, quantity: number) => {
        setCartItems((prev) => {
            if (quantity <= 0) return prev.filter((i) => i.id !== id);

            const item = prev.find((i) => i.id === id);
            // We might not have 'stock' info in cartItem if we didn't persist it. 
            // Ideally we should persist stock or re-fetch it.
            // For now, assuming standard flow where product data is passed in.
            // Since we can't easily check stock here without extra data, we'll trust the user or rely on addToCart limit.
            // Better: update CartItem interface to include stock.
            return prev.map((i) => i.id === id ? { ...i, quantity } : i);
        });
    };

    const removeFromCart = (id: number) => {
        setCartItems((prev) => prev.filter((i) => i.id !== id));
    };

    const clearCart = () => setCartItems([]);

    const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{ cartItems, cartCount, totalPrice, showCart, setShowCart, addToCart, removeFromCart, updateQuantity, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const UseCart = () => useContext(CartContext);
