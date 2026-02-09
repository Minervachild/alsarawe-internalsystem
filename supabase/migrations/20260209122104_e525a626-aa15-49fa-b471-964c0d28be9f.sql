
-- Add is_active column to profiles (admins default to active, new users default to inactive)
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT false;

-- Set existing profiles to active (so current users aren't locked out)
UPDATE public.profiles SET is_active = true;

-- Drop and recreate profiles_public view to include is_active
DROP VIEW IF EXISTS public.employees_public;
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT id, user_id, username, email, avatar_color, 
         can_edit_columns, can_view_reports, can_manage_users, is_active
  FROM public.profiles;

-- Recreate employees_public view (it depends on profiles_public)
CREATE VIEW public.employees_public
WITH (security_invoker=on) AS
  SELECT id, name, role, avatar_color, shift_type, shift_start, shift_end,
         active_days, orders_added, orders_finished, profile_id, created_at, updated_at
  FROM public.employees;

-- Helper function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE user_id = _user_id LIMIT 1),
    false
  )
$$;
