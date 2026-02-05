-- Fix overtime table to only allow admins to view (not other employees)

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated can view overtime" ON public.overtime;

-- Only admins can view overtime records
CREATE POLICY "Admins can view overtime" 
ON public.overtime 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));