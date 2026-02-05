-- =========================================
-- Security Fixes: Warn Level Issues
-- =========================================

-- 1. CREATE PUBLIC-ASSETS BUCKET FOR LOGOS (non-sensitive public assets)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to public-assets
CREATE POLICY "Authenticated users can upload public assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'public-assets' AND auth.role() = 'authenticated');

-- Allow everyone to view public assets (it's a public bucket)
CREATE POLICY "Anyone can view public assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- Allow authenticated users to delete public assets
CREATE POLICY "Authenticated users can delete public assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'public-assets' AND auth.role() = 'authenticated');

-- 2. MAKE DELIVERY-PROOFS BUCKET PRIVATE
UPDATE storage.buckets 
SET public = false 
WHERE id = 'delivery-proofs';

-- 3. FIX PERMISSIVE RLS POLICIES ON SENSITIVE TABLES

-- 3a. EMPLOYEES TABLE - Restrict management to admins
DROP POLICY IF EXISTS "Authenticated can manage employees" ON public.employees;

CREATE POLICY "Authenticated can view employees" 
ON public.employees FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can insert employees" 
ON public.employees FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update employees" 
ON public.employees FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete employees" 
ON public.employees FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 3b. OVERTIME TABLE - Users can view all, create own, admins manage all
DROP POLICY IF EXISTS "Authenticated can manage overtime" ON public.overtime;

CREATE POLICY "Authenticated can view overtime" 
ON public.overtime FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create own overtime" 
ON public.overtime FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  employee_id IN (
    SELECT e.id FROM employees e 
    INNER JOIN profiles p ON e.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update overtime" 
ON public.overtime FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete overtime" 
ON public.overtime FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 3c. SHIFT_ATTENDANCE TABLE - Users can view all, check-in own, admins manage all
DROP POLICY IF EXISTS "Authenticated can manage shift_attendance" ON public.shift_attendance;

CREATE POLICY "Authenticated can view attendance" 
ON public.shift_attendance FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create own attendance" 
ON public.shift_attendance FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  employee_id IN (
    SELECT e.id FROM employees e 
    INNER JOIN profiles p ON e.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own attendance" 
ON public.shift_attendance FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  employee_id IN (
    SELECT e.id FROM employees e 
    INNER JOIN profiles p ON e.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  employee_id IN (
    SELECT e.id FROM employees e 
    INNER JOIN profiles p ON e.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can delete attendance" 
ON public.shift_attendance FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 4. ADD PASSCODE LENGTH CONSTRAINT
-- Note: Using ALTER TABLE with CHECK constraint requires existing data to comply
-- We add constraint that allows minimum 6 characters (compromise between security and usability)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS passcode_min_length;
ALTER TABLE public.profiles ADD CONSTRAINT passcode_min_length CHECK (length(passcode) >= 6);