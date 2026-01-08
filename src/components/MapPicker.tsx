"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js/Webpack
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
    initialLat?: number;
    initialLng?: number;
    onCancel: () => void;
    onSelect: (location: {
        lat: number;
        lng: number;
        address: string;
        address_line1: string;
        address_line2: string;
        city: string;
        postal_code: string;
        country: string;
    }) => void;
}

export default function MapPicker({ initialLat, initialLng, onCancel, onSelect }: MapPickerProps) {
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [latlng, setLatlng] = useState<{ lat: number; lng: number } | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );
    const [addressPreview, setAddressPreview] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let mounted = true;

        if (containerRef.current && !mapRef.current) {
            try {
                const map = L.map(containerRef.current, {
                    center: [initialLat || -1.2921, initialLng || 36.8219], // Default to Nairobi
                    zoom: initialLat ? 14 : 12
                });

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);

                map.on('click', (e) => {
                    const { lat, lng } = e.latlng;
                    setLatlng({ lat, lng });

                    if (markerRef.current) {
                        markerRef.current.setLatLng([lat, lng]);
                    } else {
                        markerRef.current = L.marker([lat, lng]).addTo(map);
                    }

                    reverseGeocode(lat, lng).then(addrObj => {
                        if (mounted) setAddressPreview(addrObj.display_name || '');
                    }).catch(() => { });
                });

                // If initial coords provided, set marker
                if (initialLat && initialLng) {
                    markerRef.current = L.marker([initialLat, initialLng]).addTo(map);
                    reverseGeocode(initialLat, initialLng).then(addrObj => {
                        if (mounted) setAddressPreview(addrObj.display_name || '');
                    }).catch(() => { });
                    map.setView([initialLat, initialLng], 14);
                }

                mapRef.current = map;
            } catch (err) {
                console.debug('MapPicker: failed to init map', err);
            }
        }

        return () => {
            mounted = false;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [initialLat, initialLng]);

    async function reverseGeocode(lat: number, lng: number) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
            const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!r.ok) return { display_name: '', address_line1: '', address_line2: '', city: '', postal_code: '', country: '', raw: null };
            const j = await r.json();
            const addr = j.address || {};

            const line1Parts = [];
            if (addr.house_number) line1Parts.push(addr.house_number);
            if (addr.road) line1Parts.push(addr.road);
            const address_line1 = line1Parts.join(' ').trim();
            const address_line2 = addr.suburb || addr.neighbourhood || addr.city_district || '';
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const postal_code = addr.postcode || '';
            const country = addr.country || '';
            const display = j.display_name || [address_line1, address_line2, city, postal_code, country].filter(Boolean).join(', ');

            return { display_name: display, address_line1, address_line2, city, postal_code, country, raw: j };
        } catch (e) {
            console.debug('reverseGeocode failed', e);
            return { display_name: '', address_line1: '', address_line2: '', city: '', postal_code: '', country: '', raw: null };
        }
    }

    const useGeolocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            setLatlng({ lat, lng });
            if (mapRef.current) {
                mapRef.current.setView([lat, lng], 14);
                if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
                else markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
            }
            reverseGeocode(lat, lng).then(addrObj => setAddressPreview(addrObj.display_name || '')).catch(() => { });
        }, (err) => {
            console.warn('Geolocation failed', err);
        }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 });
    };

    const confirm = async () => {
        if (!latlng) return;
        // perform one final reverse geocode to obtain structured fields
        const res = await reverseGeocode(latlng.lat, latlng.lng);
        onSelect({
            lat: latlng.lat,
            lng: latlng.lng,
            address: res.display_name || '',
            address_line1: res.address_line1 || '',
            address_line2: res.address_line2 || '',
            city: res.city || '',
            postal_code: res.postal_code || '',
            country: res.country || ''
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-3 border-b flex items-center justify-between shrink-0">
                    <div className="font-semibold text-gray-900">Pick delivery location</div>
                    <div className="space-x-2">
                        <button onClick={useGeolocation} className="px-3 py-1 bg-gray-100 rounded text-sm text-gray-800 hover:bg-gray-200">Use my location</button>
                        <button onClick={onCancel} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                        <button onClick={confirm} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">Select</button>
                    </div>
                </div>
                <div className="relative w-full flex-grow" style={{ minHeight: '400px' }}>
                    <div ref={containerRef} className="absolute inset-0 bg-gray-100" />
                </div>
                <div className="p-3 border-t shrink-0">
                    <div className="text-sm text-gray-700 font-medium">{addressPreview || 'Click on the map to pick an address or use your device location.'}</div>
                </div>
            </div>
        </div>
    );
}
