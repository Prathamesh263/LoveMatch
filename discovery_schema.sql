-- Create LIKES table to track user swipes
CREATE TABLE IF NOT EXISTS public.likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    target_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    type text CHECK (type IN ('like', 'pass', 'super_like')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, target_id)
);

-- Create MATCHES table for mutual likes
CREATE TABLE IF NOT EXISTS public.matches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user1_id, user2_id)
);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Policies for LIKES
CREATE POLICY "Users can create likes" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own likes" ON public.likes
    FOR SELECT USING (auth.uid() = user_id);

-- Policies for MATCHES
-- Users can see matches they are part of
CREATE POLICY "Users can view their matches" ON public.matches
    FOR SELECT USING (
        auth.uid() = user1_id OR auth.uid() = user2_id
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS likes_target_id_idx ON public.likes(target_id);
CREATE INDEX IF NOT EXISTS matches_user1_id_idx ON public.matches(user1_id);
CREATE INDEX IF NOT EXISTS matches_user2_id_idx ON public.matches(user2_id);
