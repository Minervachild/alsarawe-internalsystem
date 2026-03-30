
-- 1. Fix privilege escalation: restrict self-signup to 'user' role only
DROP POLICY IF EXISTS "Allow insert own role during signup" ON public.user_roles;
CREATE POLICY "Allow insert own role during signup"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK ((user_id = auth.uid()) AND (role = 'user'::app_role));

-- 2. Fix profiles_public view: recreate with security_invoker so it respects caller permissions
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
  WITH (security_invoker = true)
AS
  SELECT id, user_id, can_edit_columns, can_view_reports, can_manage_users, is_active, username, email, avatar_color
  FROM public.profiles;

-- 3. Fix employees_public view: recreate with security_invoker
DROP VIEW IF EXISTS public.employees_public;
CREATE VIEW public.employees_public
  WITH (security_invoker = true)
AS
  SELECT id, name, role, avatar_color, shift_type, shift_start, shift_end, active_days, orders_added, orders_finished, profile_id, created_at, updated_at
  FROM public.employees;

-- 4. Fix inventory_movements INSERT policy: change from public to authenticated
DROP POLICY IF EXISTS "Authenticated can insert inventory_movements" ON public.inventory_movements;
CREATE POLICY "Authenticated can insert inventory_movements"
  ON public.inventory_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Fix inventory_items UPDATE policy: change from public to authenticated
DROP POLICY IF EXISTS "Authenticated can update inventory_items stock" ON public.inventory_items;
CREATE POLICY "Authenticated can update inventory_items stock"
  ON public.inventory_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Fix inventory_sessions ALL policy: change from public to authenticated
DROP POLICY IF EXISTS "Admins can manage inventory_sessions" ON public.inventory_sessions;
CREATE POLICY "Admins can manage inventory_sessions"
  ON public.inventory_sessions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. Fix inventory_session_items ALL policy: change from public to authenticated
DROP POLICY IF EXISTS "Admins can manage inventory_session_items" ON public.inventory_session_items;
CREATE POLICY "Admins can manage inventory_session_items"
  ON public.inventory_session_items
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. Fix duty_employee_assignments ALL policy: change from public to authenticated
DROP POLICY IF EXISTS "Admins can manage duty_employee_assignments" ON public.duty_employee_assignments;
CREATE POLICY "Admins can manage duty_employee_assignments"
  ON public.duty_employee_assignments
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
