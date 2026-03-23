-- UNIGUILD STORAGE SETUP (Idempotent / Repeatable)
-- Run this in your Supabase SQL Editor

-- 1. Create Buckets (Safe to run multiple times)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for 'resumes'
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'resumes' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
CREATE POLICY "Owner Update" ON storage.objects FOR UPDATE 
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE 
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);


-- 3. Storage Policies for 'banners'
DROP POLICY IF EXISTS "Public View Banners" ON storage.objects;
CREATE POLICY "Public View Banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Staff Upload Banners" ON storage.objects;
CREATE POLICY "Staff Upload Banners" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff Manage Banners" ON storage.objects;
CREATE POLICY "Staff Manage Banners" ON storage.objects FOR ALL 
USING (bucket_id = 'banners' AND auth.role() = 'authenticated');


-- 4. Storage Policies for 'avatars'
DROP POLICY IF EXISTS "Public View Avatars" ON storage.objects;
CREATE POLICY "Public View Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Owner Manage Avatars" ON storage.objects;
CREATE POLICY "Owner Manage Avatars" ON storage.objects FOR ALL 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
