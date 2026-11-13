-- ====================================================================
-- E-RISE Seed Data (Admin user & Default Channels)
-- ====================================================================

-- Insert sample public profile if needed for direct queries
-- Target admin email: erise.club@hns-re2sd.dz
DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert dummy user in auth.users if testing locally with Supabase CLI
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'erise.club@hns-re2sd.dz') THEN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, status, status_message)
    VALUES (
      v_admin_id,
      'erise.club@hns-re2sd.dz',
      'E-RISE Club Admin',
      'https://api.dicebear.com/7.x/identicon/svg?seed=erise-club',
      'online',
      'E-RISE Platform Host & Broadcaster'
    ) ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;
