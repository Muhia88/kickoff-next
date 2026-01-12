"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Camera, User as UserIcon, Loader2 } from 'lucide-react';
import { uploadAvatar } from '@/app/actions';

const ProfilePage = () => {
    const router = useRouter();
    const { user, profile, refreshUser, loading: authLoading } = useAuth(); // Removed 'setProfile' from descruturing if it's not available, if it is available we should use it.
    // Actually AuthContext exposes 'profile', but not 'setProfile' directly in the interface I viewed previously.
    // Ideally we should have a way to update the local cache immediately. 
    // I'll check AuthContext again, or just rely on local state for the UI fields.

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        address: '',
        username: ''
    });

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize data
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/signin');
        } else if (user && !saving) { // Don't overwrite if saving (user typing race condition check, though simplified)
            // Ideally we only set this ONCE on mount or when remote profile genuinely changes and we aren't editing.
            // For now, simple effect is okay as long as we don't re-trigger it while typing.
            setFormData(prev => ({
                full_name: profile?.full_name || user.user_metadata?.full_name || prev.full_name || '',
                phone: profile?.phone || user.user_metadata?.phone || prev.phone || '',
                address: profile?.address || prev.address || '',
                username: profile?.username || user.email?.split('@')[0] || ''
            }));

            // Resolve avatar URL
            const rawAvatar = profile?.avatar_url || user.user_metadata?.avatar_url;
            if (rawAvatar && !uploading) {
                resolveAvatar(rawAvatar);
            }
        }
    }, [user, profile, authLoading, router]);

    const resolveAvatar = async (path: string) => {
        if (path.startsWith('http') || path.startsWith('data:')) {
            setAvatarUrl(path);
            return;
        }
        // Use proxy
        const cleanPath = path.replace(/^\/+/, '');
        setAvatarUrl(`/api/images/${cleanPath}`);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        // OPTIMISTIC UPDATE: The UI is already showing what the user typed.
        // We just need to ensure the "Saved" message feels snappy and we don't accidentally revert.

        try {
            // 1. Update public.users
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    address: formData.address,
                })
                .eq('supabase_id', user?.id);

            if (error) throw error;

            // 2. Update Auth Metadata (for consistency/fallback)
            // Fire and forget this part if we want max speed? No, better await to ensure consistency.
            await supabase.auth.updateUser({
                data: {
                    full_name: formData.full_name,
                    phone: formData.phone
                }
            });

            setMessage({ type: 'success', text: 'Saved successfully!' });

            // 3. Refresh context in background
            refreshUser();

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        setMessage(null);

        try {
            // Use Server Action
            const fd = new FormData();
            fd.append('file', file);
            fd.append('userId', user.id);

            const uploadedPath = await uploadAvatar(fd);

            // Update profile with new path
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: uploadedPath })
                .eq('supabase_id', user.id);

            if (updateError) throw updateError;

            // Optimistic Display
            // We can try to show the uploaded file immediately via FileReader to avoid waiting for signed URL roundtrip
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) setAvatarUrl(e.target.result as string);
            };
            reader.readAsDataURL(file);

            setMessage({ type: 'success', text: 'Picture updated!' });
            refreshUser();

        } catch (err: any) {
            console.error(err);
            setMessage({ type: 'error', text: err.message || 'Failed to upload image' });
        } finally {
            setUploading(false);
        }
    };

    if (authLoading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-red-700 w-10 h-10" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-red-700 px-6 py-4">
                    <h1 className="text-2xl font-serif font-bold text-white">My Profile</h1>
                    <p className="text-red-100 text-sm">Manage your account details</p>
                </div>

                <div className="p-6 md:p-8">
                    {message && (
                        <div className={`mb-6 p-4 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center space-y-4">
                            <div
                                className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-50 transition-transform hover:scale-105"
                                style={{ boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.1)' }}
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                        <UserIcon size={48} />
                                    </div>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white backdrop-blur-sm">
                                        <Loader2 className="animate-spin" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center text-sm text-red-700 font-bold hover:text-red-800 transition-colors uppercase tracking-wide"
                                    disabled={uploading}
                                >
                                    <Camera size={16} className="mr-2" />
                                    Change Picture
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Form Section */}
                        <form onSubmit={handleSave} className="flex-1 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative group">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        className="block w-full border-0 border-b-2 border-gray-200 bg-transparent px-0 py-2 text-gray-900 focus:ring-0 focus:border-red-700 transition-colors placeholder-gray-300 font-medium"
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                                    <div className="flex items-center text-gray-400 bg-gray-50 rounded px-3 py-2 border border-gray-100 italic">
                                        <span className="text-sm">@{formData.username}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                                    <div className="flex items-center text-gray-500 bg-gray-50 rounded px-3 py-2 border border-gray-100">
                                        <span className="text-sm">{user?.email}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="block w-full border-0 border-b-2 border-gray-200 bg-transparent px-0 py-2 text-gray-900 focus:ring-0 focus:border-red-700 transition-colors placeholder-gray-300 font-medium"
                                        placeholder="+254..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Delivery Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    rows={3}
                                    className="block w-full border rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all font-medium resize-none"
                                    placeholder="Enter your street address..."
                                />
                            </div>

                            <div className="pt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-black text-white px-8 py-3 rounded-full font-bold text-sm tracking-wide hover:bg-gray-900 hover:shadow-lg disabled:opacity-50 flex items-center transition-all transform active:scale-95"
                                    style={{ boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.3)' }}
                                >
                                    {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                    {saving ? 'SAVING...' : 'SAVE CHANGES'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
