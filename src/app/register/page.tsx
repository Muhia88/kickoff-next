"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const Register = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Normalize phone number
            let normalizedPhone = phone.trim().replace(/[^0-9+]/g, '');
            if (normalizedPhone.startsWith('+')) normalizedPhone = normalizedPhone.slice(1);
            if (normalizedPhone.startsWith('0')) {
                normalizedPhone = '254' + normalizedPhone.slice(1);
            }

            // 1. Sign Up
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/confirm`,
                    data: {
                        full_name: fullName,
                        phone: normalizedPhone,
                    },
                },
            });

            if (error) throw error;

            // 2. Check for email verification requirement
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                setError("This email is already registered. Please sign in instead.");
                return;
            }

            // Supabase defaults: if email confirm is on, session is null.
            // If off, session is present.
            if (!data.session) {
                setEmailSent(true);
            } else {
                // Auto-login successful
                window.location.href = '/';
            }

        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-16 bg-gray-50">
            <div className="max-w-md mx-auto mt-8 w-full bg-white p-8 rounded-lg shadow">
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Create your account</h2>
                <p className="text-sm text-gray-600 mb-6">Sign up with your email and password.</p>

                {error && <div className="mb-4 text-red-600">{error}</div>}

                {emailSent ? (
                    <div className="p-4 bg-green-50 rounded">
                        <h3 className="text-lg font-semibold text-green-800">Confirm your email</h3>
                        <p className="mt-2 text-sm text-gray-700">We sent a confirmation email to <strong>{email}</strong>. Please check your inbox and click the confirmation link.</p>
                        <p className="mt-4 text-sm text-gray-600">After confirming, return to the <Link href="/signin" className="text-red-700 font-semibold">Sign in</Link> page.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full name</label>
                            <input
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                type="text"
                                required
                                className="mt-1 block w-full border rounded px-3 py-2 text-gray-900"
                                placeholder="Your full name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                            <input
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                type="tel"
                                className="mt-1 block w-full border rounded px-3 py-2 text-gray-900"
                                placeholder="e.g. 711000000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                type="email"
                                required
                                className="mt-1 block w-full border rounded px-3 py-2 text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                type="password"
                                required
                                className="mt-1 block w-full border rounded px-3 py-2 text-gray-900"
                            />
                        </div>

                        <button disabled={loading} type="submit" className="w-full bg-red-700 text-white py-2 rounded hover:bg-red-800 disabled:opacity-50">
                            {loading ? 'Creating...' : 'Create account'}
                        </button>
                    </form>
                )}

                <p className="mt-4 text-sm text-gray-600">Already have an account? <Link href="/signin" className="text-red-700 font-semibold">Sign in</Link></p>
            </div>
        </div>
    );
};

export default Register;
