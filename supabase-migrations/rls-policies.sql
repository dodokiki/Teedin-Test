-- ============================================
-- RLS Policies for agens table
-- ============================================

-- Enable RLS on agens table
ALTER TABLE public.agens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "agens_select_own" ON public.agens;
DROP POLICY IF EXISTS "agens_insert_own" ON public.agens;
DROP POLICY IF EXISTS "agens_update_own" ON public.agens;
DROP POLICY IF EXISTS "agens_delete_own" ON public.agens;
DROP POLICY IF EXISTS "agens_select_admin" ON public.agens;

-- Policy: Users can SELECT their own agent record
CREATE POLICY "agens_select_own"
ON public.agens
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can INSERT agent record with their own user_id
CREATE POLICY "agens_insert_own"
ON public.agens
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can UPDATE their own agent record
CREATE POLICY "agens_update_own"
ON public.agens
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can DELETE their own agent record (optional)
CREATE POLICY "agens_delete_own"
ON public.agens
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Policy: Admins can SELECT all agent records
CREATE POLICY "agens_select_admin"
ON public.agens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);

-- ============================================
-- RLS Policies for storage.objects (documents bucket)
-- ============================================

-- Enable RLS on storage.objects (should already be enabled by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "documents_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_select_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_select_admin" ON storage.objects;

-- Policy: Users can INSERT files to documents bucket (owner will be set to auth.uid() automatically)
CREATE POLICY "documents_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can SELECT their own files from documents bucket
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

-- ============================================
-- Notes:
-- ============================================
-- 1. The storage.objects policies use both 'owner' field and folder path pattern
--    to ensure compatibility with different upload methods
-- 2. Folder path pattern: files should be uploaded as "user_id/filename.ext"
-- 3. The 'owner' field is automatically set by Supabase when uploading via client SDK
-- 4. Admins can view all agent records and documents for moderation purposes

