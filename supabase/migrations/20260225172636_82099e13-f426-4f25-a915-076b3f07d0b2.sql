-- Allow employees to update their own pending sales entries
CREATE POLICY "Employees can update own pending sales_entries"
ON public.sales_entries
FOR UPDATE
TO authenticated
USING (submitted_by = auth.uid() AND status = 'pending')
WITH CHECK (submitted_by = auth.uid() AND status = 'pending');