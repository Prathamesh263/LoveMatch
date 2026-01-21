-- Add support for message types (text, audio, image)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'text' CHECK (type IN ('text', 'audio', 'image')),
ADD COLUMN IF NOT EXISTS media_url text;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload to chat_attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_attachments' AND
  auth.uid() = owner
);

-- Allow authenticated users to view chat attachments
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'chat_attachments' );
