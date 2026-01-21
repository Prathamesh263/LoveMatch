-- FORCE RESET PROFILE SCHEMA
-- WARNING: THIS WILL DELETE ALL DATA IN THE 'profiles' TABLE.
-- Use this to ensure your database schema exactly matches the code requirements.

-- 1. DROP EVERYTHING RELATED
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. RECREATE PROFILES TABLE
CREATE TABLE public.profiles (
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

-- 3. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RECREATE POLICIES
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

-- 5. STORAGE POLICIES (Safely recreate)
-- Note: We don't drop the bucket, just the policies to be safe.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- 6. RECREATE TRIGGER FUNCTION (With robust casting)
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
    -- Handle empty string or null for DOB safely
    CASE
      WHEN NULLIF(new.raw_user_meta_data->>'dob', '') IS NOT NULL
      THEN (new.raw_user_meta_data->>'dob')::date
      ELSE NULL
    END,
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'looking_for',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction (Optional: or FAIL explicitly to see it)
    -- For debugging, it's better to fail so we see the error.
    -- Re-raising...
    RAISE EXCEPTION 'Profile creation failed: % | Data: %', SQLERRM, new.raw_user_meta_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RE-ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
