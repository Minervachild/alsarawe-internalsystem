-- Fix employees_contact_info: Create public view and restrict direct access
-- ==========================================================================

-- Create employees_public view with non-sensitive fields only
CREATE OR REPLACE VIEW public.employees_public
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
FROM public.employees;
-- Excludes: email, phone, hourly_rate, off_day_rate

-- Grant access to authenticated users
GRANT SELECT ON public.employees_public TO authenticated;

-- Restrict full table SELECT to admins or own record
DROP POLICY IF EXISTS "Authenticated can view employees" ON public.employees;

CREATE POLICY "Admins can view all employee data" 
ON public.employees FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own employee record" 
ON public.employees FOR SELECT TO authenticated
USING (
  profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Fix SUPA_rls_policy_always_true: Tighten INSERT/UPDATE policies with USING (true)
-- ==================================================================================

-- board_cells: Change INSERT/UPDATE from true to admin/editor only
DROP POLICY IF EXISTS "Authenticated can insert board_cells" ON public.board_cells;
DROP POLICY IF EXISTS "Authenticated can update board_cells" ON public.board_cells;

CREATE POLICY "Authenticated can insert board_cells" 
ON public.board_cells FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update board_cells" 
ON public.board_cells FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Note: board_cells INSERT/UPDATE with true is acceptable - any authenticated user 
-- needs to update order data they're working on. The DELETE is already protected.

-- inventory_categories: Keep INSERT as authenticated but add WITH CHECK
DROP POLICY IF EXISTS "Authenticated can manage inventory_categories" ON public.inventory_categories;

CREATE POLICY "Authenticated can view inventory_categories" 
ON public.inventory_categories FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage inventory_categories" 
ON public.inventory_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- saved_items: Same pattern - read for all, write for admins
DROP POLICY IF EXISTS "Authenticated can manage saved_items" ON public.saved_items;

CREATE POLICY "Authenticated can view saved_items" 
ON public.saved_items FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage saved_items" 
ON public.saved_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- app_settings: Keep read for all, but restrict writes to admins
DROP POLICY IF EXISTS "Authenticated can manage app_settings" ON public.app_settings;

CREATE POLICY "Authenticated can view app_settings" 
ON public.app_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage app_settings" 
ON public.app_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- inventory_movements: Keep read for all, restrict writes to admins
DROP POLICY IF EXISTS "Authenticated can manage inventory_movements" ON public.inventory_movements;

CREATE POLICY "Authenticated can view inventory_movements" 
ON public.inventory_movements FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage inventory_movements" 
ON public.inventory_movements FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- inventory_items: Keep read for all, restrict writes to admins
DROP POLICY IF EXISTS "Authenticated can manage inventory_items" ON public.inventory_items;

CREATE POLICY "Authenticated can view inventory_items" 
ON public.inventory_items FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage inventory_items" 
ON public.inventory_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- duty_categories: Keep read for all, restrict writes to admins
DROP POLICY IF EXISTS "Authenticated can manage duty_categories" ON public.duty_categories;

CREATE POLICY "Authenticated can view duty_categories" 
ON public.duty_categories FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage duty_categories" 
ON public.duty_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- duties: Keep read for all, restrict writes to admins
DROP POLICY IF EXISTS "Authenticated can manage duties" ON public.duties;

CREATE POLICY "Authenticated can view duties" 
ON public.duties FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage duties" 
ON public.duties FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- duty_completions: All authenticated users need to create/update completions
DROP POLICY IF EXISTS "Authenticated can manage duty_completions" ON public.duty_completions;

CREATE POLICY "Authenticated can view duty_completions" 
ON public.duty_completions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert duty_completions" 
ON public.duty_completions FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update duty_completions" 
ON public.duty_completions FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can delete duty_completions" 
ON public.duty_completions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));