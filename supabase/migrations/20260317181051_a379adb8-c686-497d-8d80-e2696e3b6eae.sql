
-- Change default status from 'pending' to 'submitted' for both tables
ALTER TABLE public.sales_entries ALTER COLUMN status SET DEFAULT 'submitted';
ALTER TABLE public.daily_expenses ALTER COLUMN status SET DEFAULT 'submitted';

-- Update RLS policy that checks for 'pending' status
DROP POLICY IF EXISTS "Employees can update own pending sales_entries" ON public.sales_entries;
CREATE POLICY "Employees can update own submitted sales_entries"
ON public.sales_entries
FOR UPDATE
TO authenticated
USING (submitted_by = auth.uid() AND status = 'submitted')
WITH CHECK (submitted_by = auth.uid() AND status = 'submitted');
