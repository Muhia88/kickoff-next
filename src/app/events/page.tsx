"use client";

import React, { useEffect, useState } from 'react';
import EventCard from '../../components/events/EventCard';
import Spinner from '../../components/Spinner';
import { supabase } from '@/lib/supabase';

const EventsPage = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch events from DB (normalized if needed, but 'events' seems to be flat mostly)
                // Use direct select for reliability
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .order('date', { ascending: true });

                if (error) throw error;
                setEvents(data || []);
            } catch (e: any) {
                console.error("Events fetch error:", e);
                setError(e.message || "Failed to load events");
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-serif font-bold text-gray-900">Upcoming Events</h1>
                    <p className="mt-4 text-lg text-gray-600">Join us for exclusive tastings, parties, and more.</p>
                </div>

                {error && <p className="text-center text-red-600">{error}</p>}

                {loading ? (
                    <div className="flex justify-center"><Spinner /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {events.length === 0 ? (
                            <p className="col-span-full text-center text-gray-500">No upcoming events found.</p>
                        ) : (
                            events.map(ev => (
                                <EventCard key={ev.id} event={ev} />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventsPage;
