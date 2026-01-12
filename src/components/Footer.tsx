import Link from "next/link";
import { Instagram, Facebook, Twitter } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-gray-100 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
                    {/* Newsletter Signup */}
                    <div className="lg:col-span-2">
                        <h3 className="text-lg font-bold mb-4 text-gray-900">SIGN UP AND SAVE</h3>
                        <p className="text-gray-800 mb-4 text-sm font-medium">
                            Sign up to Early Kick-Off and get deals when they happen, exclusive offers, and be the first to know about new products and events.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-1 w-full sm:w-auto px-4 py-2 border border-gray-400 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-red-600"
                            />
                            <button className="w-full sm:w-auto bg-gray-900 text-white px-6 py-2 hover:bg-gray-800 transition-colors flex items-center justify-center">
                                <span className="sm:hidden mr-2">Subscribe</span> →
                            </button>
                        </div>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 text-gray-900">SUPPORT</h3>
                        <div className="space-y-2 text-sm flex flex-col font-medium">
                            <div className="text-gray-800">support@earlykickoff.com</div>
                            <div className="text-gray-800">+254700000000</div>
                            <Link href="/contact" className="text-gray-800 hover:text-red-600">Contact Us</Link>
                            <Link href="/faqs" className="text-gray-800 hover:text-red-600">FAQs</Link>
                            <Link href="/privacy" className="text-gray-800 hover:text-red-600">Terms & Privacy Policy</Link>
                        </div>
                    </div>

                    {/* Products */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 text-gray-900">PRODUCTS</h3>
                        <div className="space-y-2 text-sm flex flex-col font-medium">
                            <Link href="/spirits" className="text-gray-800 hover:text-red-600">Spirits</Link>
                            <Link href="/wine" className="text-gray-800 hover:text-red-600">Wine</Link>
                            <Link href="/craft-beer" className="text-gray-800 hover:text-red-600">Beer</Link>
                            <Link href="/bundles" className="text-gray-800 hover:text-red-600">Bundles</Link>
                        </div>
                    </div>

                    {/* Community */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 text-gray-900">COMMUNITY</h3>
                        <div className="space-y-2 text-sm flex flex-col font-medium">
                            <Link href="/blog" className="text-gray-800 hover:text-red-600">Blog</Link>
                            <Link href="/reviews" className="text-gray-800 hover:text-red-600">Reviews</Link>
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div className="flex justify-center space-x-6 mb-8">
                    <a href="#" className="text-gray-800 hover:text-red-600 transition-colors">
                        <Instagram size={24} />
                    </a>
                    <a href="#" className="text-gray-800 hover:text-red-600 transition-colors">
                        <Facebook size={24} />
                    </a>
                    <a href="#" className="text-gray-800 hover:text-red-600 transition-colors">
                        <Twitter size={24} />
                    </a>
                </div>

                {/* Bottom Section */}
                <div className="border-t border-gray-300 pt-8">
                    <h2 className="text-2xl font-serif font-bold text-center mb-4 text-gray-900">
                        Kenya&apos;s Best Online Liquor Store
                    </h2>
                    <p className="text-gray-800 text-center text-sm max-w-4xl mx-auto mb-6 font-medium">
                        Early Kick-Off Liquor is more than just a liquor store, it&apos;s a celebration of life&apos;s moments. Whether you&apos;re toasting to a special occasion or simply unwinding after a long day, we provide the finest selection of spirits, wines, and beers to elevate your experience.
                    </p>
                    <p className="text-center text-sm font-bold text-gray-900">
                        So sit back and relax - we got you covered!
                    </p>

                    {/* Copyright */}
                    <div className="text-center mt-8 pt-6 border-t border-gray-300 text-xs text-gray-600 font-medium">
                        © 2025 Early Kick-Off Liquor - All Rights Reserved. WARNING: Drinking distilled spirits, beer, coolers, wine and other alcoholic beverages may increase cancer risk, and, during pregnancy, can cause birth defects.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
