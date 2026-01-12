

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UseCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Truck, MapPin, CheckCircle, Plus, Home, AlertCircle } from 'lucide-react'; // Added icons
import ProductImage from '@/components/ProductImage';
import dynamic from 'next/dynamic';

// Dynamically import MapPicker to avoid SSR issues with Leaflet
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const Checkout = () => {
    const router = useRouter();
    const { cartItems: items, totalPrice, clearCart } = UseCart();
    const { user, session, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/signin');
        }
    }, [user, authLoading, router]);

    const [shippingMethod, setShippingMethod] = useState<'ship' | 'pickup'>('ship');
    const [notes, setNotes] = useState('');

    // Address & Map State
    const [deliveryAddress, setDeliveryAddress] = useState<any>(null); // The selected address object
    const [isAddressChoiceModalOpen, setAddressChoiceModalOpen] = useState(false);
    const [isAddressPickerOpen, setAddressPickerOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [shippingFee, setShippingFee] = useState(199);

    // M-Pesa State
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [isProcessingMpesa, setIsProcessingMpesa] = useState(false);
    const [mpesaPaymentId, setMpesaPaymentId] = useState<string | null>(null);

    // Initial phone population
    useEffect(() => {
        if (user?.user_metadata?.phone) setMpesaPhone(user.user_metadata.phone);
    }, [user]);

    const totalWithShipping = totalPrice + (items.length > 0 && shippingMethod === 'ship' ? 199 : 0);

    const LIQUORSTORE_ADDRESS = {
        recipient_name: 'Kickoff Liquorstore',
        address_line1: 'Kickoff Liquorstore, Main Street',
        address_line2: '',
        city: 'Nairobi',
        postal_code: '00100',
        country: 'Kenya',
        address: 'Kickoff Liquorstore, Main Street, Nairobi'
    };

    // Calculate profile address for quick selection
    const profileAddress = useMemo(() => {
        if (user) {
            const meta = user.user_metadata || {};
            // We construct a 'display' address object from available metadata
            // If the user has a pinned location previously saved, ideally we'd use that, but simple metadata is fallback.
            if (meta.address || meta.address_line1) {
                return {
                    recipient_name: meta.full_name || meta.name || 'Valued Customer',
                    address_line1: meta.address_line1 || '',
                    address_line2: meta.address_line2 || '',
                    city: meta.city || 'Nairobi',
                    postal_code: meta.postal_code || '',
                    country: meta.country || 'Kenya',
                    address: meta.address || `${meta.address_line1}, ${meta.city}`,
                    lat: meta.lat,
                    lng: meta.lng
                };
            }
        }
        return null;
    }, [user]);

    // Set default address when method changes
    useEffect(() => {
        if (shippingMethod === 'pickup') {
            setDeliveryAddress(LIQUORSTORE_ADDRESS);
        } else {
            // If switching back to ship, try to restore profile address if no manual selection made yet
            if (!deliveryAddress || deliveryAddress === LIQUORSTORE_ADDRESS) {
                setDeliveryAddress(profileAddress);
            }
        }
    }, [shippingMethod, profileAddress]);


    const handleCheckout = async (paymentMethod: 'cod' | 'mpesa') => {
        if (items.length === 0) return;

        if (shippingMethod === 'ship' && !deliveryAddress) {
            setError("Please select a delivery address.");
            setAddressChoiceModalOpen(true);
            return;
        }

        if (paymentMethod === 'mpesa' && !mpesaPhone) {
            setIsPhoneModalOpen(true);
            return;
        }

        setLoading(true);
        setError(null);
        if (paymentMethod === 'mpesa') setIsProcessingMpesa(true);

        try {
            // 1. Create Order
            const orderPayload = {
                items: items.map(i => ({
                    product_id: i.id,
                    quantity: i.quantity,
                    type: 'product'
                })),
                metadata: {
                    shipping_method: shippingMethod,
                    notes,
                    pinned_location: shippingMethod === 'ship' ? deliveryAddress : null,
                    payment_method: paymentMethod,
                    // Store legacy friendly pinned location
                    ...(shippingMethod === 'ship' && deliveryAddress ? {
                        lat: deliveryAddress.lat,
                        lng: deliveryAddress.lng,
                        address: deliveryAddress.address
                    } : {})
                },
                source: 'web'
            };

            const { data: orderData, error: orderError } = await supabase.functions.invoke('orders', {
                method: 'POST',
                body: orderPayload
            });

            if (orderError) throw orderError;
            if (orderData.error) throw new Error(orderData.error);

            const orderId = orderData.order_id; // Edge function returns { order_id: ... }

            // 2. Process Payment
            if (paymentMethod === 'mpesa') {
                const { data: mpesaData, error: mpesaError } = await supabase.functions.invoke('mpesa', {
                    body: {
                        action: 'initiate',
                        order_id: orderId,
                        phone_number: mpesaPhone,
                        amount: totalWithShipping
                    }
                });

                if (mpesaError) throw mpesaError;
                if (mpesaData.error) throw new Error(mpesaData.error);

                const paymentId = mpesaData.payment_id;
                setMpesaPaymentId(paymentId);

                // Poll for success
                let attempts = 0;
                const maxAttempts = 30;
                while (attempts < maxAttempts) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 2000)); // Wait 2s

                    const { data: pData } = await supabase
                        .from('payments')
                        .select('status')
                        .eq('id', paymentId)
                        .single();

                    console.log('Payment poll status:', pData?.status);

                    if (pData?.status === 'success') {
                        setIsProcessingMpesa(false);
                        setSuccess(true);
                        clearCart();
                        return; // Done
                    } else if (pData?.status === 'failed') {
                        throw new Error('Payment failed. Please try again.');
                    }
                    // Continue polling if pending
                }
                throw new Error('Payment timed out. Please check your phone.');
            }

            // COD success
            setSuccess(true);
            clearCart();

        } catch (err: any) {
            console.error(err);
            let errorMessage = err.message || "Failed to place order";

            // Extract detailed error from Edge Function response if available
            if (err && typeof err === 'object' && 'context' in err && typeof err.context.json === 'function') {
                try {
                    const errorContext = await err.context.json();
                    if (errorContext && errorContext.error) {
                        errorMessage = errorContext.error;
                    }
                } catch (e) {
                    // unexpected json parse error
                }
            }

            setError(errorMessage);
            setIsProcessingMpesa(false);
        } finally {
            setLoading(false);
        }
    };

    // Handlers for Address Modal
    const handleSelectProfileAddress = () => {
        setDeliveryAddress(profileAddress);
        setAddressChoiceModalOpen(false);
    };

    const handleAddNewAddress = () => {
        setAddressChoiceModalOpen(false);
        setAddressPickerOpen(true);
    };

    const handleMapSelect = (location: any) => {
        setDeliveryAddress({
            ...location,
            recipient_name: user?.user_metadata?.full_name || 'Valued Customer',
            // Ensure we have a formatted address string for display
            address: location.address || `${location.address_line1}, ${location.city}`
        });
        setAddressPickerOpen(false);
    };


    if (success) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gray-50 px-4">
                <CheckCircle size={64} className="text-green-600 mb-6" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
                <p className="text-gray-800 mb-8 text-center font-medium">Thank you for your order. We are processing it now.</p>
                <div className="flex gap-4">
                    <button onClick={() => router.push('/orders')} className="bg-red-700 text-white px-6 py-2 rounded font-medium shadow-sm hover:bg-red-800">View My Orders</button>
                    <button onClick={() => router.push('/')} className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded font-medium hover:bg-gray-50">Continue Shopping</button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Checkout</h1>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">
                    {/* Left Column */}
                    <div className="lg:col-span-7 space-y-8">

                        {/* 1. Delivery Method */}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">1. Delivery Method</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Ship to Me */}
                                <label className={`cursor-pointer p-4 border rounded-lg flex items-center transition-all ${shippingMethod === 'ship' ? 'border-red-600 bg-red-50' : 'hover:border-gray-400 border-gray-200'}`}>
                                    <input type="radio" name="shipping" className="hidden" checked={shippingMethod === 'ship'} onChange={() => setShippingMethod('ship')} />
                                    <div className={`p-2 rounded-full mr-4 ${shippingMethod === 'ship' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                        <Truck size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">Ship to Me</div>
                                        <div className="text-xs text-gray-700 font-medium">Delivered to your door</div>
                                    </div>
                                </label>

                                {/* Pick Up */}
                                <label className={`cursor-pointer p-4 border rounded-lg flex items-center transition-all ${shippingMethod === 'pickup' ? 'border-red-600 bg-red-50' : 'hover:border-gray-400 border-gray-200'}`}>
                                    <input type="radio" name="shipping" className="hidden" checked={shippingMethod === 'pickup'} onChange={() => setShippingMethod('pickup')} />
                                    <div className={`p-2 rounded-full mr-4 ${shippingMethod === 'pickup' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">Pick Up</div>
                                        <div className="text-xs text-gray-700 font-medium">Collect from store</div>
                                    </div>
                                </label>
                            </div>
                        </section>

                        {/* 2. Address / Location Information */}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">2. Delivery Information</h2>
                            {shippingMethod === 'ship' ? (
                                <div>
                                    {deliveryAddress ? (
                                        <div className="border border-gray-200 rounded p-4 bg-gray-50 mb-4">
                                            <p className="font-bold text-gray-900 mb-1">{deliveryAddress.recipient_name}</p>
                                            <p className="text-sm text-gray-700">{deliveryAddress.address || deliveryAddress.address_line1}</p>
                                            <p className="text-sm text-gray-700">{`${deliveryAddress.city}, ${deliveryAddress.country}`}</p>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 mb-4 items-center flex">
                                            <AlertCircle size={16} className="mr-2" />
                                            Please select a delivery address.
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setAddressChoiceModalOpen(true)}
                                        className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors flex items-center"
                                    >
                                        {deliveryAddress ? 'Change Address' : 'Add Delivery Address'}
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded p-4 bg-gray-50">
                                    <p className="font-bold text-gray-900">{LIQUORSTORE_ADDRESS.recipient_name}</p>
                                    <p className="text-sm text-gray-700">{LIQUORSTORE_ADDRESS.address_line1}</p>
                                    <p className="text-sm text-gray-700">{`${LIQUORSTORE_ADDRESS.city}, ${LIQUORSTORE_ADDRESS.country}`}</p>
                                </div>
                            )}
                        </section>

                        {/* 3. Notes */}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">3. Delivery Instructions</h2>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-shadow"
                                rows={3}
                                placeholder="Gate code, specific directions, e.g. 'Green gate, request guard to call'"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </section>
                    </div>

                    {/* Right Column: Order Summary */}
                    <div className="lg:col-span-5">
                        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 sticky top-24">
                            <h2 className="text-xl font-semibold mb-6 font-serif text-gray-900">Order Summary</h2>

                            <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300">
                                {items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                                                <ProductImage path={item.image_url} alt={item.name} className="w-full h-full object-contain p-1" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 line-clamp-1 w-32">{item.name}</div>
                                                <div className="text-gray-500">Qty: {item.quantity}</div>
                                            </div>
                                        </div>
                                        <div className="font-medium text-gray-900">KSh {(item.price * item.quantity).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-200 pt-4 space-y-2 mb-6">
                                <div className="flex justify-between text-gray-700">
                                    <span>Subtotal</span>
                                    <span>KSh {totalPrice.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-700">
                                    <span>Shipping</span>
                                    <span>{shippingFee === 0 ? 'Free' : `KSh ${shippingFee}`}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200 mt-2">
                                    <span>Total</span>
                                    <span>KSh {totalWithShipping.toLocaleString()}</span>
                                </div>
                            </div>

                            {error && <div className="mb-4 text-red-700 text-sm bg-red-50 border border-red-200 p-3 rounded">{error}</div>}

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleCheckout('mpesa')}
                                    disabled={loading}
                                    className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    {loading || isProcessingMpesa ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            {isProcessingMpesa ? 'Waiting for M-Pesa...' : 'Processing...'}
                                        </span>
                                    ) : 'Pay with M-Pesa'}
                                </button>
                                <button
                                    onClick={() => handleCheckout('cod')}
                                    disabled={loading}
                                    className="w-full bg-red-700 text-white py-3 rounded-lg font-bold hover:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    {loading ? 'Processing...' : 'Pay on Delivery'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isAddressChoiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Delivery Address</h3>
                        <div className="space-y-3">
                            {profileAddress && (
                                <button
                                    onClick={handleSelectProfileAddress}
                                    className="w-full text-left p-4 border border-gray-200 rounded-lg flex items-center gap-4 hover:bg-gray-50 hover:border-red-500 transition-all group"
                                >
                                    <Home className="w-6 h-6 text-gray-500 group-hover:text-red-600 flex-shrink-0 transition-colors" />
                                    <div>
                                        <p className="font-semibold text-gray-900 group-hover:text-red-700">Use Saved Address</p>
                                        <p className="text-xs text-gray-500">{profileAddress.address || profileAddress.address_line1}</p>
                                    </div>
                                </button>
                            )}
                            <button
                                onClick={handleAddNewAddress}
                                className="w-full text-left p-4 border border-gray-200 rounded-lg flex items-center gap-4 hover:bg-gray-50 hover:border-red-500 transition-all group"
                            >
                                <Plus className="w-6 h-6 text-gray-500 group-hover:text-red-600 flex-shrink-0 transition-colors" />
                                <div>
                                    <p className="font-semibold text-gray-900 group-hover:text-red-700">Add a New Address</p>
                                    <p className="text-xs text-gray-500">Pin a location on the map</p>
                                </div>
                            </button>
                        </div>
                        <button onClick={() => setAddressChoiceModalOpen(false)} className="mt-6 w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {isAddressPickerOpen && (
                <MapPicker
                    initialLat={deliveryAddress?.lat || -1.2921}
                    initialLng={deliveryAddress?.lng || 36.8219}
                    onCancel={() => setAddressPickerOpen(false)}
                    onSelect={handleMapSelect}
                />
            )}

            {/* M-Pesa Phone Modal */}
            {isPhoneModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-lg font-bold mb-2 text-gray-900">Enter M-Pesa Number</h3>
                        <p className="text-sm text-gray-500 mb-4">Please enter the phone number you want to pay with.</p>
                        <input
                            type="tel"
                            className="w-full border rounded p-3 mb-6 focus:ring-green-500 focus:border-green-500 outline-none"
                            placeholder="07xxxxxxxx"
                            value={mpesaPhone}
                            onChange={(e) => setMpesaPhone(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsPhoneModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button
                                onClick={() => { setIsPhoneModalOpen(false); handleCheckout('mpesa'); }}
                                className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Checkout;
