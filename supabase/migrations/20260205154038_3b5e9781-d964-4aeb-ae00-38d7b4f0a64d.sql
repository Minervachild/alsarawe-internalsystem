-- Revert to admin-only INSERT/UPDATE for employees
-- ============================================================================

-- Drop the permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON public.employees;

-- Create admin-only INSERT policy
CREATE POLICY "Admins can insert employees"
ON public.employees FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create admin-only UPDATE policy
CREATE POLICY "Admins can update employees"
ON public.employees FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));