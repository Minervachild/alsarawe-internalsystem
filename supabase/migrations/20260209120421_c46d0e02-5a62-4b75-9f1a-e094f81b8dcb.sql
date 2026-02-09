
-- 1. Create SECURITY DEFINER function to check profile permissions (avoids needing SELECT on profiles)
CREATE OR REPLACE FUNCTION public.can_edit_columns(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND can_edit_columns = true
  )
$$;

-- 2. Create SECURITY DEFINER function to get employee_id for a user (avoids needing SELECT on profiles)
CREATE OR REPLACE FUNCTION public.get_employee_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id FROM public.employees e
  JOIN public.profiles p ON e.profile_id = p.id
  WHERE p.user_id = _user_id
  LIMIT 1
$$;

-- 3. Update profiles_public view to include email (needed by getCurrentProfile)
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, user_id, username, email, avatar_color,
       can_edit_columns, can_view_reports, can_manage_users
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- 4. Remove "Users can view own profile" SELECT policy on profiles base table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 5. Update board_cells policies to use new function instead of profiles subquery
DROP POLICY IF EXISTS "Editors can delete board_cells" ON public.board_cells;
CREATE POLICY "Editors can delete board_cells"
ON public.board_cells FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR can_edit_columns(auth.uid()));

-- 6. Update board_columns policies
DROP POLICY IF EXISTS "Editors can delete board_columns" ON public.board_columns;
CREATE POLICY "Editors can delete board_columns"
ON public.board_columns FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR can_edit_columns(auth.uid()));

DROP POLICY IF EXISTS "Editors can insert board_columns" ON public.board_columns;
CREATE POLICY "Editors can insert board_columns"
ON public.board_columns FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR can_edit_columns(auth.uid()));

DROP POLICY IF EXISTS "Editors can update board_columns" ON public.board_columns;
CREATE POLICY "Editors can update board_columns"
ON public.board_columns FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR can_edit_columns(auth.uid()));

-- 7. Update board_groups policies
DROP POLICY IF EXISTS "Editors can delete board_groups" ON public.board_groups;
CREATE POLICY "Editors can delete board_groups"
ON public.board_groups FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR can_edit_columns(auth.uid()));

DROP POLICY IF EXISTS "Editors can insert board_groups" ON public.board_groups;
CREATE POLICY "Editors can insert board_groups"
ON public.board_groups FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR can_edit_columns(auth.uid()));

DROP POLICY IF EXISTS "Editors can update board_groups" ON public.board_groups;
CREATE POLICY "Editors can update board_groups"
ON public.board_groups FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR can_edit_columns(auth.uid()));

-- 8. Update board_rows policies
DROP POLICY IF EXISTS "Editors can delete board_rows" ON public.board_rows;
CREATE POLICY "Editors can delete board_rows"
ON public.board_rows FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR can_edit_columns(auth.uid()));

-- 9. Update overtime policies to use get_employee_id_for_user
DROP POLICY IF EXISTS "Users can create own overtime" ON public.overtime;
CREATE POLICY "Users can create own overtime"
ON public.overtime FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR employee_id = get_employee_id_for_user(auth.uid())
);

DROP POLICY IF EXISTS "Users can view own overtime" ON public.overtime;
CREATE POLICY "Users can view own overtime"
ON public.overtime FOR SELECT
USING (employee_id = get_employee_id_for_user(auth.uid()));

-- 10. Update shift_attendance policies
DROP POLICY IF EXISTS "Users can create own attendance" ON public.shift_attendance;
CREATE POLICY "Users can create own attendance"
ON public.shift_attendance FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR employee_id = get_employee_id_for_user(auth.uid())
);

DROP POLICY IF EXISTS "Users can update own attendance" ON public.shift_attendance;
CREATE POLICY "Users can update own attendance"
ON public.shift_attendance FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR employee_id = get_employee_id_for_user(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR employee_id = get_employee_id_for_user(auth.uid())
);

-- 11. Update employees "Users can view own employee record" to use SECURITY DEFINER function
DROP POLICY IF EXISTS "Users can view own employee record" ON public.employees;
CREATE POLICY "Users can view own employee record"
ON public.employees FOR SELECT
USING (id = get_employee_id_for_user(auth.uid()));
