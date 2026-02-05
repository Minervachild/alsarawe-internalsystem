-- Fix security definer view by recreating with SECURITY INVOKER
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
FROM public.profiles;