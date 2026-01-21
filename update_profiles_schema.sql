-- Add missing columns for the full profile setup
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS interests text[], -- Array of text
ADD COLUMN IF NOT EXISTS gender text DEFAULT 'male',
ADD COLUMN IF NOT EXISTS looking_for text DEFAULT 'female',
ADD COLUMN IF NOT EXISTS age_min int DEFAULT 18,
ADD COLUMN IF NOT EXISTS age_max int DEFAULT 99,
ADD COLUMN IF NOT EXISTS distance_max int DEFAULT 50,
ADD COLUMN IF NOT EXISTS show_gender text DEFAULT 'everyone';

-- Update the RLS policy to allow updates to these columns
-- (The existing "Users can update own profile" policy covers this generally, 
-- assuming it uses 'USING (auth.uid() = id)')
