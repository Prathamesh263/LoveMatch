-- 1. Update the 'profiles' table to match our form data
-- We need to add columns for DOB, Gender, and Looking For since likely only 'age' exists currently.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS looking_for text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Create a function that runs when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, dob, gender, looking_for, avatar_url)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'dob')::date,
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'looking_for',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger (this links Auth to your Public table)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Enable Row Level Security (RLS) if not already on
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Add Policies (so users can read/write their own data)
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING ( true );

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id );
