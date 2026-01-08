"use client";

import { useAuth } from "../context/AuthContext";
import { User, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export const UserMenu = () => {
    const { user, profile, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (!user) {
        return (
            <Link href="/signin" className="inline-flex items-center justify-center p-2 border rounded-md text-gray-700 hover:bg-gray-100">
                <User className="h-5 w-5" />
                <span className="ml-2 hidden lg:inline">Login</span>
            </Link>
        );
    }

    // Priority: Profile full_name -> Metadata full_name -> Email
    const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const firstName = fullName.split(' ')[0];

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 border rounded-md text-gray-700 hover:bg-gray-100"
            >
                <User className="h-5 w-5" />
                <span className="ml-2 hidden lg:inline max-w-[100px] truncate">{firstName}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-gray-900">{fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>

                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsOpen(false)}>
                        My Profile
                    </Link>

                    {profile?.role === 'admin' && (
                        <Link href="http://localhost:5173" target="_blank" className="block px-4 py-2 text-sm text-red-600 font-semibold hover:bg-gray-100" onClick={() => setIsOpen(false)}>
                            Admin Panel
                        </Link>
                    )}
                    <button
                        onClick={async () => {
                            await signOut();
                            setIsOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
};
