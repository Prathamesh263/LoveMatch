-- Create the storage bucket 'profile_photos' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_photos', 'profile_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all photos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile_photos' );

-- Allow authenticated users to upload files
-- This ensures they can only upload to a folder named after their user ID, or generally to the bucket
-- Using a simpler policy for now: Authenticated users can upload to the bucket
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile_photos' AND
  auth.uid() = owner
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile_photos' AND
  auth.uid() = owner
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile_photos' AND
  auth.uid() = owner
);
