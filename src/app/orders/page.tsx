"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Package, Calendar, MapPin, Truck, ShoppingBag, QrCode, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import ProductImage from '@/components/ProductImage';

// A map for status colors
const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-green-100 text-green-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    paid: 'bg-green-100 text-green-800',
};

const OrderStatus = ({ status }: { status: string }) => (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
        {status}
    </span>
);

const LIQUORSTORE_ADDRESS = {
    recipient_name: 'Kickoff Liquorstore',
    address_line1: 'Kickoff Liquorstore, Main Street',
    address_line2: '',
    city: 'Nairobi',
    postal_code: '00100',
    country: 'Kenya'
};

// Add QR Modal State in Parent
// Modified OrderCard to accept onOpenQr

const OrderCard = ({ order, address, onOpenQr }: any) => {
    return (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-in-out border border-gray-100">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center">
                            <Package size={20} className="mr-2 text-gray-500" />
                            Order #{order.order_uuid ? order.order_uuid.substring(0, 8).toUpperCase() : order.id}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                            <Calendar size={14} className="mr-2" />
                            {new Date(order.created_at).toLocaleString()}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <OrderStatus status={order.status} />
                        {(['paid', 'pending', 'processing', 'shipped'].includes(order.status.toLowerCase())) && (
                            <button
                                onClick={() => onOpenQr(order)}
                                className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                                title="View QR"
                                aria-label="View QR"
                            >
                                <QrCode size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                        <Truck size={18} className="mr-2 text-gray-500" />
                        Shipping Address
                    </h4>
                    {(() => {
                        // Parse metadata logic
                        let meta: any = {};
                        try {
                            if (typeof order.metadata === 'string') {
                                meta = JSON.parse(order.metadata);
                            } else if (typeof order.metadata === 'object' && order.metadata !== null) {
                                meta = order.metadata;
                            }
                        } catch (e) { }

                        const shippingMethod = (meta.shipping_method || order.shipping_method || '').toLowerCase();
                        const isPickup = shippingMethod === 'pickup';

                        if (!isPickup && order.shipping_address) {
                            return (
                                <div className="text-gray-600 text-sm">
                                    <div className="font-medium text-gray-900">{order.shipping_address.recipient_name}</div>
                                    <div>{order.shipping_address.address_line1}</div>
                                    {order.shipping_address.address_line2 && <div>{order.shipping_address.address_line2}</div>}
                                    <div>{order.shipping_address.city} {order.shipping_address.postal_code || ''}</div>
                                </div>
                            );
                        }

                        if (address) {
                            return <div className="text-gray-600 text-sm font-medium">{address}</div>;
                        }

                        if (isPickup) {
                            return (
                                <div className="text-gray-600 text-sm">
                                    <div className="font-medium text-gray-900">{LIQUORSTORE_ADDRESS.recipient_name}</div>
                                    <div>{LIQUORSTORE_ADDRESS.address_line1}</div>
                                </div>
                            );
                        }

                        // Try to show pinned location address from metadata immediately if available
                        const pinned = meta.pinned_location;
                        if (pinned && pinned.address) {
                            return (
                                <div className="text-gray-600 text-sm font-medium">{pinned.address}</div>
                            );
                        }

                        return (
                            <div className="text-gray-500 text-sm flex items-center">
                                <MapPin size={16} className="mr-2" />
                                No shipping address attached
                            </div>
                        );
                    })()}
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Items</h4>
                    <ul className="space-y-4">
                        {order.items?.map((it: any) => (
                            <li key={`${order.id}-${it.id}`} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        {it.product?.image_url ? (
                                            <ProductImage path={it.product.image_url} alt={it.product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Package size={16} className="text-gray-400" />
                                        )}
                                    </div>
                                    <span className="text-gray-900 font-medium">{(it.product && it.product.name) || it.name || `Product`}</span>
                                </div>
                                <span className="text-gray-600 font-medium whitespace-nowrap">Qty: {it.quantity}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Total</span>
                    <span className="text-lg font-bold text-gray-900">KSh {order.total_amount?.toLocaleString() || '0'}</span>
                </div>
            </div>
        </div>
    );
};

export default function MyOrders() {
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [addrMap, setAddrMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // QR State
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('supabase_id', user?.id)
                    .single();

                if (userError) {
                    if (user?.email) {
                        const { data: emailData, error: emailError } = await supabase
                            .from('users')
                            .select('id')
                            .eq('email', user.email)
                            .single();
                        if (emailError) throw new Error("User record not found.");
                        var userId = emailData.id;
                    } else {
                        throw new Error("User record not found.");
                    }
                } else {
                    var userId = userData.id;
                }

                const { data, error } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        items:order_items (
                            *,
                            product:products (*)
                        )
                    `)
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (!mounted) return;
                setOrders(data || []);
            } catch (err: any) {
                if (!mounted) return;
                console.error("Error fetching orders:", err);
                setError(err.message || "Failed to load orders");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        if (!authLoading && user) {
            load();
        }

        return () => { mounted = false; };
    }, [user, authLoading]);

    // Reverse Geocoding Logic (omitted for brevity, assume unchanged or needs re-insertion if full replace)
    // Actually full replace of Orders logic logic to include geocoding
    useEffect(() => {
        let cancelled = false;
        async function geocodeAll() {
            for (const o of orders) {
                if (cancelled) return;
                const meta = o.metadata || {};
                const shippingMethod = (meta.shipping_method || o.shipping_method || '').toLowerCase();
                if (shippingMethod === 'pickup') continue;
                if (o.shipping_address) continue;
                if (addrMap[o.id]) continue;
                const pinned = meta.pinned_location;
                if (!pinned) {
                    setAddrMap(prev => ({ ...prev, [o.id]: 'Nairobi (No specific address)' }));
                    continue;
                }
                if (pinned.address) {
                    setAddrMap(prev => ({ ...prev, [o.id]: pinned.address }));
                    continue;
                }
                const lat = pinned.lat;
                const lng = pinned.lng;
                if (lat && lng) {
                    try {
                        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
                        const resp = await fetch(url, { headers: { Accept: 'application/json' } });
                        if (resp.ok) {
                            const j = await resp.json();
                            const display = j.display_name || `${lat}, ${lng}`;
                            if (!cancelled) setAddrMap(prev => ({ ...prev, [o.id]: display }));
                        } else {
                            if (!cancelled) setAddrMap(prev => ({ ...prev, [o.id]: `${lat}, ${lng}` }));
                        }
                    } catch (e) {
                        if (!cancelled) setAddrMap(prev => ({ ...prev, [o.id]: `${lat}, ${lng}` }));
                    }
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }
        if (orders.length > 0) geocodeAll();
        return () => { cancelled = true; };
    }, [orders, addrMap]);

    const openQr = (order: any) => {
        setSelectedOrder(order);
        setQrModalOpen(true);
    };

    const closeQr = () => {
        setQrModalOpen(false);
        setSelectedOrder(null);
    };

    if (authLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-50 text-center px-4">
                <AlertCircle size={48} className="text-red-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-6">You need to sign in to view your orders.</p>
                <Link href="/signin" className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors">
                    Sign In
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">My Orders</h1>

                {/* QR MODAL */}
                {qrModalOpen && selectedOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeQr}>
                        <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Order QR Code</h3>
                                <p className="text-sm text-gray-500 mb-6">Scan this code to verify your order</p>

                                <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200 inline-block mb-4">
                                    {/* USE ProductImage for secure loading */}
                                    {/* Determine path: prefer metadata.qr_object_path, else qr_image_url */}
                                    <ProductImage
                                        path={
                                            (selectedOrder.metadata && selectedOrder.metadata.qr_object_path)
                                            || selectedOrder.qr_image_url
                                        }
                                        alt="Order QR"
                                        className="w-48 h-48"
                                    />
                                </div>

                                <div className="text-xs text-gray-400 font-mono mb-6">
                                    #{selectedOrder.id.toString().padStart(6, '0')}
                                </div>

                                <button
                                    onClick={closeQr}
                                    className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-600 text-red-700 p-4 rounded-md mb-8" role="alert">
                        <p className="font-bold">Error</p>
                        <p>Failed to load orders: {error}</p>
                    </div>
                )}

                {!loading && orders.length === 0 && (
                    <div className="text-center py-20 px-6 bg-white rounded-lg shadow-sm border border-gray-100">
                        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-6" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Orders Yet</h2>
                        <p className="text-gray-500 mb-8">It looks like you haven't placed any orders yet.</p>
                        <Link href="/" className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all">
                            Start Shopping
                        </Link>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {orders.map((o) => (
                        <OrderCard key={o.id} order={o} address={addrMap[o.id]} onOpenQr={openQr} />
                    ))}
                </div>
            </div>
        </div>
    );
}
