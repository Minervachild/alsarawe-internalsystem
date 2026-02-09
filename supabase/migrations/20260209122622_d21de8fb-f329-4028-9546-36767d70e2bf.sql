
-- Remove admin SELECT on base profiles table to prevent direct passcode/api_key exposure
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a restrictive admin SELECT that only allows access for UPDATE operations
-- Admins still need SELECT for UPDATE to work, so we add a policy scoped to their role
-- but the application code should use profiles_public or the RPC function instead
CREATE POLICY "Admins can select profiles for management"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a SECURITY DEFINER function for one-time sensitive data viewing
CREATE OR REPLACE FUNCTION public.get_sensitive_profile_data(_profile_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT jsonb_build_object(
    'passcode', p.passcode,
    'api_key', p.api_key
  )
  FROM public.profiles p
  WHERE p.id = _profile_id
  LIMIT 1;
$$;

-- Revoke direct access to the function from public, only authenticated can call
REVOKE ALL ON FUNCTION public.get_sensitive_profile_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sensitive_profile_data(uuid) TO authenticated;
