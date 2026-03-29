CREATE POLICY "Users can update own submitted expenses"
ON public.daily_expenses
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND status = 'submitted')
WITH CHECK (created_by = auth.uid() AND status = 'submitted');