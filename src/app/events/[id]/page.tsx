"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/Spinner';
import ProductImage from '@/components/ProductImage';

interface Event {
    id: number;
    name: string;
    date: string | Date;
    location: string;
    description?: string;
    price?: number | string;
    ticket_price?: number | string;
    image?: string;
    image_url?: string;
    imageUrl?: string;
}

const EventDetails = ({ params }: { params: { id: string } }) => {
    // In Next.js App Router, params is a prop, but here we can just use the prop passed to the page
    // Note: Page component receives params. However, this component code is inside the page file below usually.
    // For this file, I'll export the component to be used in page.tsx or write page.tsx directly.
    return null;
};

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
    // Next.js 15 params is async
    const router = useRouter();
    const { user } = useAuth();

    // Unwrap params
    const [eventId, setEventId] = useState<string | null>(null);

    useEffect(() => {
        params.then(p => setEventId(p.id));
    }, [params]);

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modals
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [phone, setPhone] = useState('');
    const [mpesaProcessing, setMpesaProcessing] = useState(false);
    const [mpesaError, setMpesaError] = useState<string | null>(null);

    useEffect(() => {
        if (!eventId) return;

        const fetchEvent = async () => {
            setLoading(true);
            try {
                // Try fetching from edge function or DB
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', eventId)
                    .single();

                if (error) throw error;
                setEvent(data);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch event');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [eventId]);

    const handleBuyTicket = () => {
        if (!user) {
            setShowAuthPrompt(true);
            return;
        }
        setShowCheckoutModal(true);
    };

    // Prefill Phone
    useEffect(() => {
        if (user?.user_metadata?.phone) {
            let p = user.user_metadata.phone.replace(/\D/g, '');
            if (p.startsWith('0')) p = '254' + p.substring(1);
            if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
            setPhone(p);
        }
    }, [user]);

    const handleMpesaPay = async () => {
        if (!phone) {
            setMpesaError('Please enter a phone number');
            return;
        }

        setMpesaProcessing(true);
        setMpesaError(null);

        try {
            // Initiate M-Pesa Payment directly (Tickets decoupled from Orders)
            const { data, error } = await supabase.functions.invoke('mpesa', {
                body: {
                    action: 'initiate',
                    event_id: event?.id,
                    quantity: 1, // Default 1
                    phone_number: phone
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            const paymentId = data.payment_id;

            // Poll for Success
            let attempts = 0;
            const maxAttempts = 30; // 60 seconds
            const pollInterval = setInterval(async () => {
                attempts++;
                const { data: pData } = await supabase
                    .from('payments')
                    .select('status')
                    .eq('id', paymentId)
                    .single();

                if (pData?.status === 'success') {
                    clearInterval(pollInterval);
                    setMpesaProcessing(false);
                    setShowCheckoutModal(false);
                    router.push('/my-tickets?success=true');
                } else if (pData?.status === 'failed') {
                    clearInterval(pollInterval);
                    setMpesaProcessing(false);
                    setMpesaError('Payment failed. Please try again.');
                }

                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    setMpesaProcessing(false);
                    setMpesaError('Payment timed out. Check your phone.');
                }
            }, 2000);

        } catch (err: any) {
            console.error('Payment error:', err);
            setMpesaProcessing(false);
            setMpesaError(err.message || 'Failed to initiate payment');
        }
    };


    if (loading) return <div className="py-20 text-center"><Spinner /></div>;
    if (error) return <div className="py-20 text-center text-red-600">{error}</div>;
    if (!event) return <div className="py-20 text-center">Event not found.</div>;

    const fmtTicketPrice = () => {
        const p = Number(event?.ticket_price ?? event?.price ?? 0) || 0;
        try {
            return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(p).replace('KSH', 'KSh');
        } catch {
            return `KSh ${p}`;
        }
    };

    return (
        <div className="bg-white">
            <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    <div>
                        <div>
                            <ProductImage
                                path={event.image || event.image_url || event.imageUrl}
                                alt={event.name}
                                className="w-full rounded-lg shadow-2xl object-cover aspect-[4/3] bg-gray-100"
                            />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h1 className="text-4xl lg:text-5xl font-serif font-bold text-gray-900">{event.name}</h1>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600">
                            <div className="flex items-center">
                                <Calendar className="w-5 h-5 mr-2 text-red-600" />
                                <span className="font-medium">{(() => {
                                    try {
                                        const dt = event?.date ? new Date(event.date) : null;
                                        if (!dt || isNaN(dt.getTime())) return String(event.date) || 'Date TBA';
                                        return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                                    } catch {
                                        return String(event.date);
                                    }
                                })()}</span>
                            </div>
                            <div className="flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-red-600" />
                                <span className="font-medium">7:00 PM onwards</span>
                            </div>
                        </div>
                        <div className="flex items-center text-gray-600">
                            <MapPin className="w-5 h-5 mr-2 text-red-600" />
                            <span className="font-medium">{event.location}</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{event.description}</p>
                        <div className="bg-gray-100 p-6 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Ticket Price</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {fmtTicketPrice()}
                                </p>
                            </div>
                            <button
                                onClick={handleBuyTicket}
                                className="w-full sm:w-auto bg-red-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-red-800 transition-transform transform hover:scale-105"
                            >
                                Buy Ticket
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Auth Prompt Modal */}
            {showAuthPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={() => setShowAuthPrompt(false)}>
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-2">Sign in required</h3>
                        <p className="text-sm text-gray-600 mb-4">You need an account to purchase tickets.</p>
                        <div className="flex gap-2">
                            <button onClick={() => router.push('/signin')} className="flex-1 py-2 rounded bg-red-600 text-white">Sign in</button>
                            <button onClick={() => router.push('/signup')} className="flex-1 py-2 rounded border">Create account</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={() => setShowCheckoutModal(false)}>
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-2">Pay with M-Pesa</h3>
                        <p className="text-sm text-gray-600 mb-4">Enter the phone number to receive the M-Pesa prompt.</p>
                        <input
                            className="w-full border rounded px-3 py-2 mb-3 text-gray-900"
                            placeholder="2547XXXXXXXX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                        <div className="flex gap-2 items-center">
                            <button
                                onClick={handleMpesaPay}
                                disabled={mpesaProcessing}
                                className={`flex-1 py-2 rounded text-white font-medium ${mpesaProcessing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {mpesaProcessing ? 'Processing...' : 'Pay with M-Pesa'}
                            </button>
                            <button
                                onClick={() => setShowCheckoutModal(false)}
                                disabled={mpesaProcessing}
                                className="py-2 px-4 rounded border text-black hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                        {mpesaError && (
                            <div className="mt-3 text-red-600 text-sm">{mpesaError}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
