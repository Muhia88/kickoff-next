import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function ComingSoonPage({ title }: { title: string }) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <div className="flex-grow flex items-center justify-center">
                <div className="text-center p-8">
                    <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">{title}</h1>
                    <p className="text-gray-600 text-lg">Coming Soon</p>
                    <div className="mt-8 w-16 h-1 bg-red-700 mx-auto"></div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
