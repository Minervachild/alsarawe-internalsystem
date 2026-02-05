-- Fix clients table RLS policies to restrict write operations to admins only
-- while allowing all authenticated users to view clients (needed for order creation)

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated can manage clients" ON public.clients;

-- Allow all authenticated users to view clients (needed for creating orders)
CREATE POLICY "Authenticated can view clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (true);

-- Only admins can insert new clients
CREATE POLICY "Admins can insert clients" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update clients
CREATE POLICY "Admins can update clients" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete clients
CREATE POLICY "Admins can delete clients" 
ON public.clients 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));