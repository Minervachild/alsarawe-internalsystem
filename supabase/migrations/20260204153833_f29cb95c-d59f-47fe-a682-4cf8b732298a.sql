-- ===========================================
-- FIX 1: Protect user credentials in profiles table
-- ===========================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can check profiles for setup" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a view for non-sensitive profile data that admins can query
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, user_id, username, avatar_color, can_edit_columns, can_view_reports, can_manage_users
FROM public.profiles;

-- Grant access to the public view
GRANT SELECT ON public.profiles_public TO authenticated;

-- Users can only view their own full profile (including passcode for login verification)
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all profiles (needed for user management)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- ===========================================
-- FIX 2: Restrict app_accounts to admins only
-- ===========================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated can manage app_accounts" ON public.app_accounts;

-- Only admins can manage third-party credentials
CREATE POLICY "Admins can manage app_accounts" 
ON public.app_accounts FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- ===========================================
-- FIX 3: Prevent self-privilege escalation with trigger
-- ===========================================

-- Create a trigger function to prevent non-admins from modifying permission fields
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is NOT an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    -- Prevent changing permission fields on own profile
    IF (NEW.can_edit_columns IS DISTINCT FROM OLD.can_edit_columns OR
        NEW.can_manage_users IS DISTINCT FROM OLD.can_manage_users OR
        NEW.can_view_reports IS DISTINCT FROM OLD.can_view_reports OR
        NEW.api_key IS DISTINCT FROM OLD.api_key) THEN
      RAISE EXCEPTION 'Only admins can modify permissions';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_permission_updates ON public.profiles;
CREATE TRIGGER enforce_permission_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_privilege_escalation();