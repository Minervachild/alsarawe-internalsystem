
-- Add status column to sales_entries
ALTER TABLE public.sales_entries 
ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Add approved_by and approved_at columns
ALTER TABLE public.sales_entries 
ADD COLUMN approved_by uuid,
ADD COLUMN approved_at timestamp with time zone;

-- Add SELECT policy so employees can see their own entries (but we'll restrict in UI)
CREATE POLICY "Employees can view own sales_entries"
ON public.sales_entries
FOR SELECT
USING (submitted_by = auth.uid());
