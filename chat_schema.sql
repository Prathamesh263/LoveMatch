-- Create MESSAGES table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    is_read boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view their own messages" ON public.messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- Indexes
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);
