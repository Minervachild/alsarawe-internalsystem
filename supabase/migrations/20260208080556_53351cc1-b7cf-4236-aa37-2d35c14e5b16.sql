-- Allow employees to view their own overtime records (to see paid/unpaid status)
CREATE POLICY "Users can view own overtime"
ON public.overtime
FOR SELECT
USING (
  employee_id IN (
    SELECT e.id
    FROM employees e
    JOIN profiles p ON e.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);
