-- FIX: Allow users to INSERT into matches table
-- Previously, only SELECT was allowed, so match creation failed.

CREATE POLICY "Users can insert matches" ON public.matches
    FOR INSERT WITH CHECK (
        auth.uid() = user1_id OR auth.uid() = user2_id
    );
