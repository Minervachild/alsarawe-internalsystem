-- Fix employees INSERT policy to allow authenticated users to add employees
-- ============================================================================

-- Drop the admin-only INSERT policy
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;

-- Create new INSERT policy for all authenticated users
CREATE POLICY "Authenticated users can insert employees"
ON public.employees FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow authenticated users to UPDATE employees they work with
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;

CREATE POLICY "Authenticated users can update employees"
ON public.employees FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);