
-- Add new columns to overtime table
ALTER TABLE public.overtime 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS off_day_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS off_day_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS off_day_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS approved_amount numeric,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Update existing entries to 'approved' status so they don't break
UPDATE public.overtime SET status = 'approved' WHERE status = 'submitted';

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Admins full access overtime" ON public.overtime;
DROP POLICY IF EXISTS "Users can create own overtime" ON public.overtime;
DROP POLICY IF EXISTS "Users can delete own overtime" ON public.overtime;
DROP POLICY IF EXISTS "Users can view own overtime" ON public.overtime;

-- Admin full access
CREATE POLICY "Admins full access overtime"
  ON public.overtime FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Employees can insert their own entries
CREATE POLICY "Employees can insert own overtime"
  ON public.overtime FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = get_employee_id_for_user(auth.uid())
    AND submitted_by = auth.uid()
  );

-- Employees can view their own entries
CREATE POLICY "Employees can view own overtime"
  ON public.overtime FOR SELECT
  TO authenticated
  USING (employee_id = get_employee_id_for_user(auth.uid()));

-- Employees can update their own submitted entries
CREATE POLICY "Employees can update own submitted overtime"
  ON public.overtime FOR UPDATE
  TO authenticated
  USING (
    employee_id = get_employee_id_for_user(auth.uid())
    AND status = 'submitted'
  )
  WITH CHECK (
    employee_id = get_employee_id_for_user(auth.uid())
    AND status = 'submitted'
  );

-- Employees can delete their own submitted entries
CREATE POLICY "Employees can delete own submitted overtime"
  ON public.overtime FOR DELETE
  TO authenticated
  USING (
    employee_id = get_employee_id_for_user(auth.uid())
    AND status = 'submitted'
  );
