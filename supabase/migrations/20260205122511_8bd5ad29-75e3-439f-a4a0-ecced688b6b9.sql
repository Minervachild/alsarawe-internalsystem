-- Fix 1: Update INSERT policy to allow admin users to add employees
-- The policy exists but let's make sure it uses public schema explicitly
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
CREATE POLICY "Admins can insert employees" 
ON public.employees 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Add off_day_rate column to employees table for tracking daily rate
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS off_day_rate numeric DEFAULT NULL;

COMMENT ON COLUMN public.employees.off_day_rate IS 'Daily rate for off-day/weekend work in SAR';