"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Ticket, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function MyTickets() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/signin');
        }
    }, [user, authLoading, router]);

    if (authLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (!user) {
        return null; // Redirecting...
    }

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">My Tickets</h1>

                <div className="text-center py-20 px-6 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Ticket size={64} className="mx-auto text-gray-300 mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">My Tickets</h2>
                    <p className="text-gray-500 mb-8">Feature coming soon. Check back later!</p>
                    <Link href="/" className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all">
                        Continue Shopping
                    </Link>
                </div>
            </div>
        </div>
    );
}
