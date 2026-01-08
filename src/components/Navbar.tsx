"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from 'next/link';
import { Menu, ShoppingCart, Heart, X, Search, ChevronDown } from "lucide-react";
import { useRouter } from 'next/navigation';
import { UseCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { UserMenu } from './UserMenu';


// MobileSidebarItem component
const MobileSidebarItem = ({ title, to, href, children, onDrawerClose }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const isExpandable = !!children;

    if (!isExpandable) {
        const Component = to ? Link : 'a';
        return (
            <Component
                href={to || href}
                onClick={onDrawerClose}
                className="block w-full font-bold text-gray-950 py-3 border-b border-gray-100 hover:text-red-700"
            >
                {title}
            </Component>
        );
    }

    return (
        <div className="border-b border-gray-200">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center font-bold text-gray-950 py-3"
            >
                <span>{title}</span>
                <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>
            {isOpen && (
                <div className="pt-2 pb-3 pl-4 space-y-1">
                    {children}
                </div>
            )}
        </div>
    );
};

const Navbar = () => {
    const { user, profile, refreshUser } = useAuth();
    const { cartCount, showCart, setShowCart } = UseCart();
    const router = useRouter();

    const isVip = profile?.role === 'vip' || profile?.is_vip;

    const [isLiquorOpen, setIsLiquorOpen] = useState(false);
    const liquorRef = useRef<HTMLLIElement>(null);

    // Search state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchToggleRef = useRef<HTMLButtonElement>(null);

    // Mobile drawer state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const mobileMenuToggleRef = useRef<HTMLButtonElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        if (!isLiquorOpen) return;
        const handleOutside = (e: MouseEvent) => {
            if (liquorRef.current && !liquorRef.current.contains(e.target as Node)) {
                setIsLiquorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isLiquorOpen]);

    useEffect(() => {
        if (!user) refreshUser().catch(() => { });
    }, []);

    const closeSearch = useCallback(() => {
        if (searchInputRef.current) searchInputRef.current.blur();
        if (searchToggleRef.current) searchToggleRef.current.focus();
        setIsSearchOpen(false);
    }, []);

    useEffect(() => {
        if (!isSearchOpen) return;
        const handleOutside = (e: MouseEvent) => {
            if (searchToggleRef.current?.contains(e.target as Node)) return;
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                closeSearch();
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isSearchOpen, closeSearch]);

    useEffect(() => {
        if (isSearchOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isSearchOpen]);

    const submitHeaderSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = (searchQuery || '').trim();
        if (!q) return;
        closeSearch();
        setSearchQuery('');
        router.push(`/search?q=${encodeURIComponent(q)}`);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        mobileMenuToggleRef.current?.focus();
    };

    // Static categories for now, can implement fetch later
    const liquorStoreCategories = [
        { name: 'Whisky' },
        { name: 'Gin' },
        { name: 'Vodka' },
        { name: 'Wine' },
        { name: 'Rum' },
        { name: 'Tequila' },
        { name: 'Cognac & Brandy' },
        { name: 'Beer & Cider' },
        { name: 'Liqueurs & Aperitifs' },
        { name: 'Ready-to-Drink (RTD) & Local Spirits' },
        { name: 'Non-Alcoholic, Mixers & Snacks' },
        { name: 'Accessories' },
        { name: 'Smokes' }
    ];

    return (
        <header className="w-full bg-white border-b sticky top-0 z-50 shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center space-x-4">
                        <button
                            ref={mobileMenuToggleRef}
                            className="lg:hidden inline-flex items-center justify-center p-2 border rounded-md text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsDrawerOpen(true)}
                            aria-label="Open menu"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        <div className="flex flex-col md:flex-row items-center md:space-x-3">
                            {isVip && (
                                <div className="text-xs bg-yellow-400 text-black px-2 py-1 rounded mb-1 md:mb-0 font-semibold">VIP MEMBER</div>
                            )}
                            <Link href="/" className="flex items-center">
                                <div className="relative h-16 w-32">
                                    <img
                                        src="/logo/kickoff_logo.jpeg"
                                        alt="The Early Kick-Off"
                                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                            </Link>
                        </div>
                    </div>

                    <nav className="hidden lg:flex flex-1 justify-center items-center">
                        <ul className="flex items-center space-x-6">
                            <li ref={liquorRef} className="relative">
                                <button
                                    onClick={() => setIsLiquorOpen((s) => !s)}
                                    className="text-gray-900 hover:text-red-700 px-3 py-2 text-sm font-semibold flex items-center gap-1 transition-colors"
                                >
                                    Liquor Store
                                    <ChevronDown className="w-4 h-4" />
                                </button>

                                {isLiquorOpen && (
                                    <div className="absolute left-0 top-full mt-2 p-4 bg-white border shadow-lg rounded-md z-50 min-w-[220px]">
                                        <div className="grid grid-cols-1">
                                            {liquorStoreCategories.map((category) => (
                                                <Link
                                                    key={category.name}
                                                    href={`/category/${encodeURIComponent(category.name)}`}
                                                    className="block p-2 text-sm text-gray-700 hover:text-red-700 hover:bg-gray-50 rounded transition-colors font-medium"
                                                >
                                                    {category.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </li>
                            <li><Link href="/events" className="text-gray-900 hover:text-red-700 font-medium text-sm">Events</Link></li>
                            <li><Link href="/merchandise" className="text-gray-900 hover:text-red-700 font-medium text-sm">Merchandise</Link></li>
                            {user && (
                                <>
                                    <li><Link href="/orders" className="text-gray-900 hover:text-red-700 font-medium text-sm">My Orders</Link></li>
                                    <li><Link href="/my-tickets" className="text-gray-900 hover:text-red-700 font-medium text-sm">My Tickets</Link></li>
                                </>
                            )}
                        </ul>
                    </nav>

                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <button
                                ref={searchToggleRef}
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className="inline-flex items-center justify-center p-2 border rounded-md text-gray-700 hover:bg-gray-100"
                            >
                                <Search className="h-5 w-5" />
                            </button>

                            {isSearchOpen && (
                                <div ref={searchRef} className="fixed left-4 right-4 top-28 md:absolute md:left-auto md:right-0 md:top-full mt-2 md:w-96 bg-white p-3 md:p-4 shadow-xl border rounded-lg z-50">
                                    <form onSubmit={submitHeaderSearch} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                        <input
                                            ref={searchInputRef}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="flex-1 w-full px-3 py-2 md:px-4 md:py-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black text-sm md:text-base"
                                            placeholder="Products, brands or categories"
                                        />
                                        <button
                                            type="submit"
                                            className="bg-black text-white px-4 py-2 rounded-md font-medium text-sm md:text-base w-full sm:w-auto hover:bg-gray-900 transition-colors"
                                        >
                                            Go
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                        <UserMenu />
                        <Link href="/wishlist" className="inline-flex items-center justify-center p-2 border rounded-md text-gray-700 hover:bg-gray-100">
                            <Heart className="h-5 w-5" />
                        </Link>
                        <button
                            onClick={() => setShowCart(true)}
                            className="relative inline-flex items-center justify-center p-2 border rounded-md text-gray-700 hover:bg-gray-100"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {cartCount > 0 && !showCart && (
                                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Drawer */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black opacity-50" onClick={closeDrawer} />
                    <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-bold text-lg">Menu</span>
                            <button onClick={closeDrawer}><X className="w-6 h-6" /></button>
                        </div>
                        <nav className="space-y-2">
                            <MobileSidebarItem title="Liquor Store" onDrawerClose={closeDrawer}>
                                {liquorStoreCategories.map(c => (
                                    <Link key={c.name} href={`/category/${c.name}`} className="block py-2 text-gray-800 font-medium hover:text-red-700" onClick={closeDrawer}>{c.name}</Link>
                                ))}
                            </MobileSidebarItem>
                            <Link href="/events" onClick={closeDrawer} className="block py-3 border-b border-gray-100 font-bold text-gray-950 hover:text-red-700">Events</Link>
                            <Link href="/merchandise" onClick={closeDrawer} className="block py-3 border-b border-gray-100 font-bold text-gray-950 hover:text-red-700">Merchandise</Link>
                            {user && (
                                <>
                                    <Link href="/orders" onClick={closeDrawer} className="block py-3 border-b border-gray-100 font-bold text-gray-950 hover:text-red-700">My Orders</Link>
                                    <Link href="/my-tickets" onClick={closeDrawer} className="block py-3 border-b border-gray-100 font-bold text-gray-950 hover:text-red-700">My Tickets</Link>
                                </>
                            )}
                        </nav>
                    </aside>
                </div>
            )}
        </header>
    );
};

export default Navbar;
