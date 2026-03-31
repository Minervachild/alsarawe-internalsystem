CREATE POLICY "Users can delete own overtime"
ON public.overtime
FOR DELETE
TO authenticated
USING (employee_id = get_employee_id_for_user(auth.uid()));