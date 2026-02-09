
-- Fix admin policies to be PERMISSIVE so admins can actually do everything
-- sales_entries
DROP POLICY IF EXISTS "Admins can manage sales_entries" ON public.sales_entries;
CREATE POLICY "Admins can manage sales_entries" ON public.sales_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view sales_entries" ON public.sales_entries;

-- employees
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employee data" ON public.employees;
CREATE POLICY "Admins full access employees" ON public.employees FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- branches
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- branch_assignments
DROP POLICY IF EXISTS "Admins can manage branch_assignments" ON public.branch_assignments;
CREATE POLICY "Admins can manage branch_assignments" ON public.branch_assignments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can select profiles for management" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins full access profiles" ON public.profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins full access roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- clients
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
CREATE POLICY "Admins full access clients" ON public.clients FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- app_accounts
DROP POLICY IF EXISTS "Admins can manage app_accounts" ON public.app_accounts;
CREATE POLICY "Admins can manage app_accounts" ON public.app_accounts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- app_settings
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;
CREATE POLICY "Admins can manage app_settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- overtime
DROP POLICY IF EXISTS "Admins can delete overtime" ON public.overtime;
DROP POLICY IF EXISTS "Admins can update overtime" ON public.overtime;
DROP POLICY IF EXISTS "Admins can view overtime" ON public.overtime;
CREATE POLICY "Admins full access overtime" ON public.overtime FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- inventory tables
DROP POLICY IF EXISTS "Admins can manage inventory_items" ON public.inventory_items;
CREATE POLICY "Admins can manage inventory_items" ON public.inventory_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage inventory_categories" ON public.inventory_categories;
CREATE POLICY "Admins can manage inventory_categories" ON public.inventory_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage inventory_movements" ON public.inventory_movements;
CREATE POLICY "Admins can manage inventory_movements" ON public.inventory_movements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- duties
DROP POLICY IF EXISTS "Admins can manage duties" ON public.duties;
CREATE POLICY "Admins can manage duties" ON public.duties FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage duty_categories" ON public.duty_categories;
CREATE POLICY "Admins can manage duty_categories" ON public.duty_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- quality
DROP POLICY IF EXISTS "Admins can manage quality sections" ON public.quality_sections;
CREATE POLICY "Admins can manage quality sections" ON public.quality_sections FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage quality items" ON public.quality_items;
CREATE POLICY "Admins can manage quality items" ON public.quality_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage quality criteria" ON public.quality_criteria;
CREATE POLICY "Admins can manage quality criteria" ON public.quality_criteria FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- bot_register_templates
DROP POLICY IF EXISTS "Admins can manage bot_register_templates" ON public.bot_register_templates;
CREATE POLICY "Admins can manage bot_register_templates" ON public.bot_register_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- saved_items
DROP POLICY IF EXISTS "Admins can manage saved_items" ON public.saved_items;
CREATE POLICY "Admins can manage saved_items" ON public.saved_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
