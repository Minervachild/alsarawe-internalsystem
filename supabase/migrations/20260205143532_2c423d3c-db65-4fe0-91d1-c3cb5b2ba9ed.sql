-- Fix employees_public_no_rls: Add filtering to the view for access control
-- ===========================================================================

-- Drop and recreate the view with proper access control
DROP VIEW IF EXISTS public.employees_public CASCADE;

CREATE VIEW public.employees_public
WITH (security_invoker=on) AS
SELECT 
  id,
  name,
  role,
  avatar_color,
  shift_type,
  shift_start,
  shift_end,
  active_days,
  orders_finished,
  orders_added,
  profile_id,
  created_at,
  updated_at
FROM public.employees
WHERE 
  -- Only show to admins (can see all) or users viewing their own record
  public.has_role(auth.uid(), 'admin')
  OR profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  );

-- Grant access to authenticated users (the WHERE clause above handles the filtering)
GRANT SELECT ON public.employees_public TO authenticated;