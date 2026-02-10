-- Allow all authenticated users to insert clients
CREATE POLICY "All users can create clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (true);
