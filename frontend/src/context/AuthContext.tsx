import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, UserStatus } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateStatus: (status: UserStatus, statusMessage?: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isDemoMode: boolean;
}

const defaultAdminUser: UserProfile = {
  id: 'erise-admin-001',
  email: 'erise.club@hns-re2sd.dz',
  full_name: 'E-RISE Club Admin',
  avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=erise-club',
  status: 'online',
  status_message: 'Broadcasting & Platform Operations',
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('erise_user');
    return saved ? JSON.parse(saved) : defaultAdminUser;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Supabase auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch public profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const loadedUser: UserProfile = {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            status: profile.status || 'online',
            status_message: profile.status_message || '',
            created_at: profile.created_at,
          };
          setUser(loadedUser);
          localStorage.setItem('erise_user', JSON.stringify(loadedUser));
        }
      } else {
        // fallback to saved local or default
        const saved = localStorage.getItem('erise_user');
        if (!saved) {
          setUser(defaultAdminUser);
        }
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password?: string) => {
    if (!isSupabaseConfigured) {
      // Demo mode login
      const newUser: UserProfile = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        email,
        full_name: email.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${email}`,
        status: 'online',
        status_message: 'Available',
        created_at: new Date().toISOString(),
      };
      setUser(newUser);
      localStorage.setItem('erise_user', JSON.stringify(newUser));
      return { success: true };
    }

    if (!password) {
      // Magic link
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        const loadedUser: UserProfile = {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          status: profile.status || 'online',
          status_message: profile.status_message || '',
        };
        setUser(loadedUser);
        localStorage.setItem('erise_user', JSON.stringify(loadedUser));
      }
    }
    return { success: true };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) {
      const newUser: UserProfile = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        email,
        full_name: fullName,
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${fullName}`,
        status: 'online',
        status_message: 'Available',
        created_at: new Date().toISOString(),
      };
      setUser(newUser);
      localStorage.setItem('erise_user', JSON.stringify(newUser));
      return { success: true };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${fullName}`,
        },
      },
    });

    if (error) return { success: false, error: error.message };

    if (data.user) {
      const newUser: UserProfile = {
        id: data.user.id,
        email: data.user.email || email,
        full_name: fullName,
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${fullName}`,
        status: 'online',
        status_message: 'Available',
      };
      setUser(newUser);
      localStorage.setItem('erise_user', JSON.stringify(newUser));
    }
    return { success: true };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('erise_user');
  };

  const updateStatus = async (status: UserStatus, statusMessage?: string) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      status,
      status_message: statusMessage !== undefined ? statusMessage : user.status_message,
    };
    setUser(updated);
    localStorage.setItem('erise_user', JSON.stringify(updated));

    if (isSupabaseConfigured) {
      await supabase
        .from('profiles')
        .update({
          status,
          status_message: updated.status_message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      ...updates,
    };
    setUser(updated);
    localStorage.setItem('erise_user', JSON.stringify(updated));

    if (isSupabaseConfigured) {
      await supabase
        .from('profiles')
        .update({
          full_name: updated.full_name,
          avatar_url: updated.avatar_url,
          status: updated.status,
          status_message: updated.status_message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        updateStatus,
        updateProfile,
        isDemoMode: !isSupabaseConfigured,
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
