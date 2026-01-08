"use client";

import { MessageCircle } from 'lucide-react';

const WhatsAppContact = () => {
    return (
        <button
            onClick={() => window.open('https://wa.me/254759572355', '_blank')}
            className="fixed bottom-6 left-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            title="Contact us on WhatsApp"
        >
            <MessageCircle size={24} />
        </button>
    );
};

export default WhatsAppContact;
