'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function AgeVerificationModal() {
    const [show, setShow] = useState(false);
    const [blocked, setBlocked] = useState(false);

    useEffect(() => {
        // Check localStorage on mount
        const isVerified = localStorage.getItem('isOver18');
        if (isVerified !== 'true') {
            setShow(true);
        }
    }, []);

    const handleYes = () => {
        localStorage.setItem('isOver18', 'true');
        setShow(false);
    };

    const handleNo = () => {
        setBlocked(true);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-xl shadow-2xl text-center flex flex-col items-center">
                <div className="w-48 h-24 relative mb-6">
                    <Image
                        src="/logo/kickoff_logo.jpeg"
                        alt="The Early Kick-Off"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>

                {!blocked ? (
                    <>
                        <h2 className="font-serif text-3xl font-bold text-gray-900 mb-4">Welcome</h2>
                        <p className="font-sans text-gray-600 mb-8 leading-relaxed">
                            You must be of legal drinking age in your country to visit this site.
                            <br />
                            Please verify that you are 18 years of age or older.
                        </p>

                        <div className="w-full space-y-3">
                            <button
                                onClick={handleYes}
                                className="w-full bg-black text-white font-bold py-4 rounded-lg hover:bg-gray-900 transition-colors uppercase tracking-wide"
                            >
                                Yes, I am over 18
                            </button>
                            <button
                                onClick={handleNo}
                                className="w-full bg-transparent text-gray-500 font-semibold py-3 hover:text-red-700 transition-colors"
                            >
                                No, I am under 18
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="py-8">
                        <h2 className="font-serif text-2xl font-bold text-red-700 mb-4">Access Denied</h2>
                        <p className="text-gray-600">
                            We're sorry, but you are not old enough to view this website.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
