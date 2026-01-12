"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import ProductImage from '@/components/ProductImage';
import { Calendar, MapPin, X } from 'lucide-react';

function MyTicketsContent() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/signin');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) fetchTickets();
    }, [user]);

    const fetchTickets = async () => {
        try {
            // Need to fetch user_id (int) if tickets uses int FK
            // OR if tickets uses UUID, just user.id
            // Based on previous tasks, user_id is Integer.

            // 1. Get Int ID
            const { data: userData } = await supabase.from('users').select('id').eq('supabase_id', user!.id).single();
            if (!userData) {
                console.error("User not found in public.users");
                setLoading(false);
                return;
            }

            // 2. Fetch Tickets
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    *,
                    event:events (*)
                `)
                .eq('user_id', userData.id)
                .order('id', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (err) {
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

    const showSuccess = searchParams.get('success');
    const warning = searchParams.get('warning');

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">My Tickets</h1>

                {warning && (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6 relative">
                        <strong className="font-bold">Warning: </strong>
                        <span className="block sm:inline">{decodeURIComponent(warning)}</span>
                        <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => router.replace('/my-tickets')}>
                            <X className="h-4 w-4" />
                        </span>
                    </div>
                )}

                {showSuccess && !warning && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 relative">
                        <strong className="font-bold">Success! </strong>
                        <span className="block sm:inline">Your ticket has been purchased successfully.</span>
                        <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => router.replace('/my-tickets')}>
                            <X className="h-4 w-4" />
                        </span>
                    </div>
                )}

                {tickets.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg shadow">
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No tickets yet</h3>
                        <p className="text-gray-500 mb-6">You haven't purchased any tickets yet.</p>
                        <button onClick={() => router.push('/events')} className="bg-red-700 text-white px-6 py-2 rounded font-medium hover:bg-red-800">Browse Events</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                                <div className="h-48 relative bg-gray-200">
                                    <ProductImage path={ticket.event?.image || ticket.event?.image_url} alt={ticket.event?.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" eventId={ticket.event_id} />
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{ticket.event?.name}</h3>

                                    <div className="space-y-2 mb-4 text-sm text-gray-600 flex-1">
                                        <div className="flex items-center">
                                            <Calendar size={16} className="mr-2 text-red-600" />
                                            <span>
                                                {ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString() : 'Date TBA'}
                                            </span>
                                        </div>
                                        <div className="flex items-center">
                                            <MapPin size={16} className="mr-2 text-red-600" />
                                            <span className="line-clamp-1">{ticket.event?.location}</span>
                                        </div>
                                        <div className="mt-2 text-xs uppercase tracking-wide font-semibold text-gray-500">
                                            Ticket #{ticket.ticket_uid?.slice(0, 8)}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${ticket.is_used ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                            {ticket.is_used ? 'USED' : 'VALID'}
                                        </span>
                                        <button
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="text-red-700 font-medium text-sm hover:underline"
                                        >
                                            View QR Code
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* QR Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}>
                    <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-2xl text-center relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedTicket.event?.name}</h3>
                        <p className="text-sm text-gray-500 mb-6">Scan this QR code at the entrance</p>

                        <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-200 inline-block mb-4">
                            <ProductImage
                                path={selectedTicket.qr_object_path || `imageBank/tickets/${selectedTicket.event_id}/${selectedTicket.ticket_uid}.png`}
                                alt="Ticket QR"
                                className="w-48 h-48"
                            />
                        </div>

                        <div className="text-xs text-gray-400 font-mono">
                            {selectedTicket.ticket_uid}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MyTicketsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>}>
            <MyTicketsContent />
        </Suspense>
    );
}
