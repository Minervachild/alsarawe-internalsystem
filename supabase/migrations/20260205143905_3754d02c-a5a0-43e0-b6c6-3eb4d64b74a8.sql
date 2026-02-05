-- Fix profiles_public view: Add proper access control
-- ===================================================

-- Drop and recreate with SECURITY INVOKER and proper filtering
DROP VIEW IF EXISTS public.profiles_public CASCADE;

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  username,
  avatar_color,
  can_edit_columns,
  can_view_reports,
  can_manage_users
FROM public.profiles
WHERE 
  -- Only show to admins (can see all) or users viewing their own profile
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid();

-- Grant access to authenticated users only
GRANT SELECT ON public.profiles_public TO authenticated;

-- Revoke access from anon/public
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;