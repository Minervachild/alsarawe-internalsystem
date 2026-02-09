-- Remove email column from employees table (keep only phone for contact)
ALTER TABLE public.employees DROP COLUMN IF EXISTS email;

-- Update employees_public view to reflect this change
DROP VIEW IF EXISTS public.employees_public;

CREATE VIEW public.employees_public
WITH (security_invoker=on) AS
  SELECT id, name, role, avatar_color, shift_type, shift_start, shift_end,
         active_days, orders_added, orders_finished, profile_id, created_at, updated_at
  FROM public.employees;