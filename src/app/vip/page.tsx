"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const vipBenefits = [
    'Priority invites to hosted events',
    'Priority reservations',
    'Access to private events',
    'Early access to limited-edition bottles',
    'Frequent discounted prices',
    'Priority delivery with discounts',
    'Discounted merch (caps, hoodies)',
    'Loyalty points system',
    'VIP-only community groups',
];

const Vip = () => {
    const router = useRouter();
    const { user, profile, refreshUser } = useAuth();
    const [showCheckout, setShowCheckout] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (user) {
            const meta = user.user_metadata || {};
            setName(profile?.full_name || meta.full_name || meta.name || '');
            setEmail(user.email || '');
            // Prefill Phone from Profile or Metadata
            const userPhone = profile?.phone || meta.phone || '';
            if (userPhone) setPhone(userPhone);
        }
    }, [user, profile]);

    const isVip = () => {
        if (!user) return false;
        // Check profile (DB) or metadata (Auth)
        if (profile?.role === 'vip' || profile?.is_vip) return true;

        const meta = user.user_metadata || {};
        if (meta.is_vip || meta.role === 'vip') return true;

        if (meta.vip_expires) {
            const exp = new Date(meta.vip_expires);
            if (!isNaN(exp.getTime()) && exp > new Date()) return true;
        }

        return false;
    };

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        // 1. Format Phone to 254
        let formattedPhone = phone.replace(/\s/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('+254')) {
            formattedPhone = formattedPhone.slice(1);
        }

        // Ensure it starts with 254 (if user typed 7... without 0)
        if (!formattedPhone.startsWith('254') && formattedPhone.length === 9) {
            formattedPhone = '254' + formattedPhone;
        }

        try {
            // 2. Initiate Payment via M-Pesa Edge Function
            const { data, error } = await supabase.functions.invoke('mpesa', {
                body: {
                    action: 'initiate',
                    plan: 'vip',
                    phone_number: formattedPhone
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            alert(`Payment initiated! Please check your phone (${formattedPhone}) and enter your PIN.`);

            // 3. Poll / Wait for Update
            // For simplicity, we'll wait a bit and try to refresh user. 
            // Real-time would be better, but polling is easier to implement without websocket setup here.

            const checkInterval = setInterval(async () => {
                await refreshUser();
                if (isVip()) {
                    clearInterval(checkInterval);
                    setProcessing(false);
                    // Success State handled by render logic
                }
            }, 3000);

            // Timeout after 60s
            setTimeout(() => {
                clearInterval(checkInterval);
                if (processing) {
                    setProcessing(false);
                    // Just let them close or try again. 
                    // Ideally check payment status from DB.
                }
            }, 60000);

        } catch (err: any) {
            console.error("VIP Purchase Error:", err);
            alert("Payment Failed: " + err.message);
            setProcessing(false);
        }
    };

    const renderModalBody = () => {
        if (!user) {
            return (
                <div className="py-8 text-center">
                    <p className="text-gray-700 mb-4">You must be signed in to purchase a VIP membership.</p>
                    <div className="flex flex-col gap-3">
                        <button
                            className="w-full bg-red-700 text-white py-3 rounded font-bold hover:bg-red-800"
                            onClick={() => router.push('/signin')}
                        >
                            Sign in to continue
                        </button>
                        <button
                            className="w-full bg-white border border-gray-300 text-gray-800 py-3 rounded font-semibold hover:bg-gray-50"
                            onClick={() => router.push('/register')}
                        >
                            Create account
                        </button>
                    </div>
                </div>
            );
        }

        if (isVip()) {
            return (
                <div className="text-center py-8">
                    <div className="text-3xl mb-2">✨</div>
                    <div className="text-lg font-semibold text-green-600 mb-2">You're already a VIP</div>
                    <div className="text-gray-700 mb-4">Your VIP membership is active. Thank you!</div>
                    <button className="bg-red-700 text-white px-6 py-2 rounded" onClick={() => setShowCheckout(false)}>Close</button>
                </div>
            );
        }

        return (
            <form className="space-y-4" onSubmit={handlePay}>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="mt-1 block w-full border rounded px-3 py-2 text-gray-900"
                        placeholder="Your name"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        readOnly
                        value={email}
                        className="mt-1 block w-full border rounded px-3 py-2 bg-gray-100 text-gray-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number (M-Pesa)</label>
                    <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="mt-1 block w-full border rounded px-3 py-2 text-gray-900"
                        placeholder="2547XXXXXXXX"
                    />
                    <p className="text-xs text-gray-500 mt-1">Please ensure format starts with 254 or 07...</p>
                </div>
                <button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-red-700 text-white py-3 rounded font-bold mt-4 hover:bg-red-800 transition-colors disabled:opacity-60"
                >
                    {processing ? 'Processing Payment...' : 'Pay KSh 2,000'}
                </button>
            </form>
        );
    };

    return (
        <div className="min-h-screen bg-white py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {/* Left: VIP image */}
                    <div className="flex items-center justify-center">
                        <img
                            src="/VIP2.jpg"
                            alt="VIP Experience"
                            className="rounded-lg shadow-lg w-full max-w-md object-cover"
                            style={{ maxHeight: '400px' }}
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=1740' }}
                        />
                    </div>

                    {/* Right: Benefits */}
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-red-700 mb-4">Become a VIP Member</h1>
                        <ul className="space-y-3 mb-8">
                            {vipBenefits.map((benefit, i) => (
                                <li key={i} className="flex items-center text-gray-800 text-lg">
                                    <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full mr-3" />
                                    {benefit}
                                </li>
                            ))}
                        </ul>
                        <button
                            className="bg-red-700 text-white px-8 py-3 text-lg font-bold rounded hover:bg-red-800 transition-colors duration-200 shadow-lg"
                            onClick={() => setShowCheckout(true)}
                        >
                            Become a VIP (KSh 2,000/month)
                        </button>
                    </div>
                </div>

                {/* Checkout Modal */}
                {showCheckout && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
                        onClick={() => setShowCheckout(false)}
                    >
                        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                                onClick={() => setShowCheckout(false)}
                                aria-label="Close"
                            >
                                <X size={24} />
                            </button>
                            <h2 className="text-2xl font-bold mb-4 text-red-700">VIP Membership Checkout</h2>
                            {renderModalBody()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Vip;
