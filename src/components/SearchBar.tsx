"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const SearchBar = ({ className = '' }: { className?: string }) => {
    const [query, setQuery] = useState('');
    const router = useRouter();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = (query || '').trim();
        if (!q) return;
        router.push(`/search?q=${encodeURIComponent(q)}`);
    };

    return (
        <div className={`w-full ${className}`}>
            <form onSubmit={submit} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow rounded-lg p-2 md:p-3 lg:p-4 flex flex-col sm:flex-row items-stretch gap-2 md:gap-3">
                    <label htmlFor="site-search" className="sr-only">Search</label>
                    <input
                        id="site-search"
                        aria-label="Search products, brands or categories"
                        placeholder="Products, brands or categories"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 px-3 py-2 md:px-4 md:py-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black text-gray-900 text-sm md:text-base w-full"
                    />

                    <button
                        type="submit"
                        className="inline-flex items-center justify-center px-4 py-2 md:px-6 md:py-3 bg-black hover:bg-gray-900 text-white border border-white rounded-md font-medium text-sm md:text-base w-full sm:w-auto mt-2 sm:mt-0"
                    >
                        Search
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SearchBar;
