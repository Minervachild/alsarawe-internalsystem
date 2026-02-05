-- Create secure RPC function for passcode authentication
-- This replaces client-side passcode lookup with server-side verification
-- Only returns minimal user info (user_id, username) to prevent data exposure
CREATE OR REPLACE FUNCTION public.authenticate_with_passcode(
  _passcode TEXT
)
RETURNS TABLE(user_id UUID, username TEXT) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username 
  FROM public.profiles p
  WHERE p.passcode = _passcode
  LIMIT 1;
$$;

-- Grant execute to anon role so unauthenticated users can login
GRANT EXECUTE ON FUNCTION public.authenticate_with_passcode TO anon;

-- Grant execute to authenticated role as well (for shift check-in)
GRANT EXECUTE ON FUNCTION public.authenticate_with_passcode TO authenticated;