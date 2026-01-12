
"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CheckCircle } from 'lucide-react';

const EmailConfirmed = () => {

    useEffect(() => {
        // The user suggested they want to sign in explicitly.
        // So we sign them out if the confirmation link auto-logged them in.
        // This ensures the "clean slate" they requested.
        const clearSession = async () => {
            await supabase.auth.signOut();
        };
        clearSession();
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <div className="flex justify-center mb-6">
                    <div className="rounded-full bg-green-100 p-3">
                        <CheckCircle size={48} className="text-green-600" />
                    </div>
                </div>

                <h1 className="text-2xl font-serif font-bold text-gray-900 mb-4">Email Confirmed!</h1>
                <p className="text-gray-600 mb-8">
                    Your email address has been successfully verified. You can now access your account.
                </p>

                <Link
                    href="/signin"
                    className="block w-full bg-red-700 text-white py-3 rounded-lg font-bold hover:bg-red-800 transition-colors shadow-sm"
                >
                    Sign In
                </Link>
            </div>
        </div>
    );
};

export default EmailConfirmed;
