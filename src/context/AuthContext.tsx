"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: any | null; // Profile from public.users table
    loading: boolean;
    refreshUser: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    refreshUser: async () => { },
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (currentUser: User) => {
        try {
            // Direct DB Query (Primary)
            const { data: dbData, error: dbError } = await supabase
                .from('users')
                .select('*')
                .eq('supabase_id', currentUser.id)
                .single();

            if (!dbError && dbData) {
                setProfile(dbData);
            } else {
                console.log("Profile not found in public.users, attempting to create...");
                // Auto-create profile from auth metadata
                const now = new Date().toISOString();
                const meta = currentUser.user_metadata || {};

                const { data: newData, error: createError } = await supabase
                    .from('users')
                    .insert([
                        {
                            supabase_id: currentUser.id,
                            email: currentUser.email,
                            username: meta.username || currentUser.email?.split('@')[0],
                            full_name: meta.full_name || meta.name || 'User',
                            phone: meta.phone || null,
                            role: 'user', // Requested default
                            status: 'pending',
                            created_at: now,
                            updated_at: now,
                            is_email_confirmed: !!currentUser.email_confirmed_at,
                            is_phone_confirmed: !!currentUser.phone_confirmed_at,
                            avatar_url: meta.avatar_url || meta.picture || null,
                            metadata: meta,
                            address: meta.address || null
                        }
                    ])
                    .select()
                    .single();

                if (!createError && newData) {
                    setProfile(newData);
                    console.log("Profile created successfully.");
                } else {
                    console.error("Failed to auto-create profile:", createError);
                    // Fallback to metadata for UI
                    setProfile(null);
                }
            }
        } catch (err) {
            console.error("Profile fetch error", err);
        }
    };

    const refreshUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
            await fetchProfile(session.user);
        } else {
            setProfile(null);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            setLoading(true);
            await refreshUser();
            setLoading(false);
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // If profile is empty or user changed, fetch profile
                if (!profile || profile.supabase_id !== session.user.id) {
                    await fetchProfile(session.user);
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, refreshUser, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
