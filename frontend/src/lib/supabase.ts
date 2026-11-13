import { createClient } from '@supabase/supabase-js';

// Production Supabase Instance for E-RISE
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ygougrhejaesbtifacdk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MIl6WWMSsnArxxjzOTB4hw_FK1sBh3z';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
