-- FIX SCRIPT: Run this to resolve "Database error saving new user"

-- 1. Ensure all columns exist in 'profiles' (Idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS looking_for text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_min int DEFAULT 18;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_max int DEFAULT 99;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS distance_max int DEFAULT 50;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_gender text DEFAULT 'everyone';

-- 2. Drop existing objects to reset logic
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Recreate the Handler Function (Robust Version)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    dob, 
    gender, 
    looking_for,
    avatar_url
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    -- Safely cast DOB, fallback to NULL if invalid/missing prevents crash
    CASE 
      WHEN new.raw_user_meta_data->>'dob' IS NOT NULL 
      THEN (new.raw_user_meta_data->>'dob')::date 
      ELSE NULL 
    END,
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'looking_for',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Permission Check (Fixes "permission denied" errors)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
