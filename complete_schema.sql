-- COMPLETE DB SETUP: Run this in the Supabase SQL Editor to reset/setup the schema.
-- WARNING: This will drop the 'profiles' table and lose existing user data in 'profiles'.

-- 1. CLEANUP (Optional: Remove if you want to preserve data)
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. CREATE PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name text,
  biography text,
  dob date,
  gender text,
  looking_for text,
  avatar_url text,
  photos jsonb DEFAULT '[]'::jsonb,
  interests text[] DEFAULT '{}',
  age_min int DEFAULT 18,
  age_max int DEFAULT 99,
  distance_max int DEFAULT 50,
  show_gender text DEFAULT 'everyone',
  is_premium boolean DEFAULT false,
  latitude float,
  longitude float,
  last_online timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Allow everyone to view profiles (needed for swiping/matching)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING ( true );

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

-- 5. STORAGE SETUP (Avatars)
-- Note: You might need to create the bucket 'avatars' manually in the dashboard if this fails.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

-- Allow public access to view avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Anyone can upload an avatar"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Allow users to update/delete their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- 6. HANDLE NEW USER TRIGGER
-- This ensures that when a user signs up via Auth, a row is created in 'profiles'
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
