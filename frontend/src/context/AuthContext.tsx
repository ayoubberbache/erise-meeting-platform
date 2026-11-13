import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserStatus } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Check active Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // 2. Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (authUser: any) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const fullName = profile?.full_name || 
        authUser.user_metadata?.full_name || 
        authUser.user_metadata?.name || 
        authUser.email?.split('@')[0] || 
        'User';

      const avatarUrl = profile?.avatar_url || 
        authUser.user_metadata?.avatar_url || 
        authUser.user_metadata?.picture || 
        `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(authUser.id)}`;

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        full_name: fullName,
        avatar_url: avatarUrl,
        status: (profile?.status as UserStatus) || 'online',
        status_message: profile?.status_message || '',
        created_at: profile?.created_at || authUser.created_at,
      });
    } catch {
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        avatar_url: authUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(authUser.id)}`,
        status: 'online',
      });
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const signInWithEmail = async (email: string, password?: string) => {
    try {
      if (!password) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      if (data.user) {
        await loadUserProfile(data.user);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(fullName)}`,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) return { success: false, error: error.message };

      if (data.session && data.user) {
        // Auto-confirmed session
        await loadUserProfile(data.user);
        return { success: true, needsConfirmation: false };
      }

      // Supabase created user but requires email verification click
      return { success: true, needsConfirmation: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const nextUser = { ...user, ...updates };
    setUser(nextUser);

    try {
      await supabase
        .from('profiles')
        .update({
          full_name: nextUser.full_name,
          avatar_url: nextUser.avatar_url,
          status: nextUser.status,
          status_message: nextUser.status_message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch (e) {
      console.warn('Profile update error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
