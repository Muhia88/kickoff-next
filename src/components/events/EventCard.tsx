"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Tag } from 'lucide-react';
import ProductImage from '../ProductImage';

interface Event {
    id: number;
    name: string;
    date: string | Date;
    location: string;
    price?: number | string;
    ticket_price?: number | string;
    description?: string;
    image?: string;
    image_url?: string;
    imageUrl?: string;
}

const EventCard = ({ event }: { event: Event }) => {


    const fmtPrice = (p: any) => {
        const val = (event && (event.ticket_price ?? event.price)) ?? p;
        if (val == null || val === '') return 'Free';
        try {
            const n = typeof val === 'string' ? parseFloat(String(val).replace(/[^0-9.-]+/g, '')) : Number(val);
            if (Number.isNaN(n) || n === 0) return 'Free';
            return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n).replace('KSH', 'KSh');
        } catch {
            return 'KSh ' + String(val || '0');
        }
    };

    const fmtDate = (d: any) => {
        if (!d) return 'Date TBA';
        try {
            const dt = (d instanceof Date) ? d : new Date(d);
            if (isNaN(dt.getTime())) return String(d);
            return dt.toLocaleString();
        } catch {
            return String(d);
        }
    };

    const shortDesc = (event?.description || '').length > 100 ? `${(event.description || '').substring(0, 100)}...` : (event?.description || '');

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <Link href={`/events/${event.id}`} className="flex flex-col flex-grow">
                <div className="relative">
                    <div className="w-full h-56 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                        <ProductImage path={event.image_url} alt={event.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" eventId={event.id} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-4">
                        <h2 className="text-2xl font-serif font-bold text-white">{event?.name || 'Untitled Event'}</h2>
                    </div>
                </div>
                <div className="p-6 flex-grow flex flex-col">
                    <div className="flex items-center text-gray-600 mb-2">
                        <Calendar className="w-5 h-5 mr-2 text-red-600" />
                        <span className="text-sm font-medium">{fmtDate(event?.date)}</span>
                    </div>
                    <div className="flex items-center text-gray-600 mb-4">
                        <MapPin className="w-5 h-5 mr-2 text-red-600" />
                        <span className="text-sm font-medium">{event?.location || 'Location TBA'}</span>
                    </div>
                    <p className="text-gray-700 text-sm flex-grow mb-4">{shortDesc}</p>
                    <div className="mt-auto flex justify-between items-center">
                        <p className="text-xl font-bold text-gray-900 flex items-center">
                            <Tag className="w-5 h-5 mr-2 text-green-500" />
                            {fmtPrice(event?.price)}
                        </p>
                        <span
                            className="bg-red-700 text-white font-bold py-2 px-4 rounded-md hover:bg-red-800 transition-colors duration-300 text-sm"
                        >
                            View Details
                        </span>
                    </div>
                </div>
            </Link>
        </div>
    );
};

export default EventCard;
