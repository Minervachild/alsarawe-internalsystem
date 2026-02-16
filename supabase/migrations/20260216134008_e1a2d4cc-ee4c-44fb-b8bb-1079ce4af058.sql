
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage page access" ON public.user_page_access;
DROP POLICY IF EXISTS "Users can view own page access" ON public.user_page_access;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can manage page access"
ON public.user_page_access
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own page access"
ON public.user_page_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
