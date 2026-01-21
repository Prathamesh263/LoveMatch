-- FIX: Allow users to see likes sent TO them (target_id)
-- Previous policy only allowed seeing likes sent BY them (user_id)

DROP POLICY IF EXISTS "Users can view their own likes" ON public.likes;

CREATE POLICY "Users can view likes involved in" ON public.likes
    FOR SELECT USING (
        auth.uid() = user_id OR auth.uid() = target_id
    );
