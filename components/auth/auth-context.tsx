'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: 'github' | 'google') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithOAuth: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取初始 session（包含处理 OAuth 回调）
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[Auth] getSession:', { session: session?.user?.email, error });
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听 auth 变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] onAuthStateChange:', event, { user: session?.user?.email });
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string) => {
    console.log('[Auth] signUp start:', { email });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    console.log('[Auth] signUp result:', {
      user: data.user?.email,
      session: !!data.session,
      error: error?.message,
      code: error?.code,
      status: error?.status,
    });
    return { error: error?.message || null };
  };

  const signInWithOAuth = async (provider: 'github' | 'google') => {
    console.log('[Auth] signInWithOAuth start:', provider);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
    if (error) {
      console.log('[Auth] signInWithOAuth error:', error);
      return { error: error.message };
    }
    console.log('[Auth] signInWithOAuth success, redirecting to:', redirectTo);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithOAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
