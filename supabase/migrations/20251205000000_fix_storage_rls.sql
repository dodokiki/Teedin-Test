-- ============================================
-- Fix Storage RLS Policies for documents bucket
-- ============================================

-- 1. Ensure the 'documents' bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (standard practice)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies for 'documents' bucket to avoid conflicts
DROP POLICY IF EXISTS "documents_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_select_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_select_admin" ON storage.objects;
-- Also drop any potentially conflicting policies with different names but same purpose
DROP POLICY IF EXISTS "Give users access to own folder 1oj01k_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01k_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01k_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01k_3" ON storage.objects;

-- 4. Create comprehensive RLS policies

-- Policy: Users can INSERT files to documents bucket
-- Rule: Must be in 'documents' bucket AND file path must start with user_id/
CREATE POLICY "documents_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can SELECT their own files
-- Rule: Must be in 'documents' bucket AND (owner is user OR file path starts with user_id/)
CREATE POLICY "documents_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Policy: Users can UPDATE their own files
CREATE POLICY "documents_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Policy: Users can DELETE their own files
CREATE POLICY "documents_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Policy: Admins can SELECT all files from documents bucket
CREATE POLICY "documents_select_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);
