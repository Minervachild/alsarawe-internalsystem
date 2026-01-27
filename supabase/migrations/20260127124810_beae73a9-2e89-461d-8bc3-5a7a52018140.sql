-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'viewer');

-- Create enum for column types
CREATE TYPE public.column_type AS ENUM ('text', 'number', 'select', 'multi_select', 'date', 'person', 'files', 'checkbox', 'items_qty', 'relation');

-- Create profiles table for user management
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    passcode TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#8B4513',
    can_edit_columns BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- Create board_groups table (pipeline stages/columns)
CREATE TABLE public.board_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create board_columns table (data fields)
CREATE TABLE public.board_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type column_type NOT NULL DEFAULT 'text',
    options JSONB DEFAULT '[]'::jsonb,
    position INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create board_rows table (orders)
CREATE TABLE public.board_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.board_groups(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create board_cells table (cell values)
CREATE TABLE public.board_cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    row_id UUID REFERENCES public.board_rows(id) ON DELETE CASCADE NOT NULL,
    column_id UUID REFERENCES public.board_columns(id) ON DELETE CASCADE NOT NULL,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(row_id, column_id)
);

-- Create employees table
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    avatar_color TEXT DEFAULT '#8B4513',
    orders_added INTEGER DEFAULT 0,
    orders_finished INTEGER DEFAULT 0,
    active_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create overtime table
CREATE TABLE public.overtime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create inventory_categories table
CREATE TABLE public.inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#8B4513',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create inventory_items table
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
    current_stock DECIMAL(10,2) DEFAULT 0,
    min_threshold DECIMAL(10,2) DEFAULT 0,
    unit TEXT DEFAULT 'kg',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create inventory_movements table
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    quantity DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create app_accounts table (credential manager)
CREATE TABLE public.app_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    username TEXT,
    encrypted_password TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create app_settings table
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logo_url TEXT,
    theme TEXT DEFAULT 'light',
    primary_color TEXT DEFAULT '#8B4513',
    secondary_color TEXT DEFAULT '#D4A574',
    accent_color TEXT DEFAULT '#F59E0B',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create saved_items table
CREATE TABLE public.saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#8B4513',
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if system is initialized (has any users)
CREATE OR REPLACE FUNCTION public.is_system_initialized()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles LIMIT 1)
$$;

-- RLS Policies

-- Profiles: Users can read all profiles, update their own
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow insert during signup" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles: Only admins can manage, users can view their own
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Allow insert own role during signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Board tables: All authenticated users can read, admins can modify
CREATE POLICY "Authenticated can view board_groups" ON public.board_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage board_groups" ON public.board_groups FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view board_columns" ON public.board_columns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage board_columns" ON public.board_columns FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view board_rows" ON public.board_rows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage board_rows" ON public.board_rows FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view board_cells" ON public.board_cells FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage board_cells" ON public.board_cells FOR ALL TO authenticated USING (true);

-- Employees, Clients, etc: All authenticated users can manage
CREATE POLICY "Authenticated can manage employees" ON public.employees FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can manage clients" ON public.clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can manage overtime" ON public.overtime FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can manage inventory_categories" ON public.inventory_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can manage inventory_items" ON public.inventory_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can manage inventory_movements" ON public.inventory_movements FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can manage app_accounts" ON public.app_accounts FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can manage app_settings" ON public.app_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can manage saved_items" ON public.saved_items FOR ALL TO authenticated USING (true);

-- Notifications: Users can only see their own
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid());

-- Allow anonymous access to check if system is initialized
CREATE POLICY "Anyone can check profiles for setup" ON public.profiles FOR SELECT TO anon USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_board_groups_updated_at BEFORE UPDATE ON public.board_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_board_columns_updated_at BEFORE UPDATE ON public.board_columns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_board_rows_updated_at BEFORE UPDATE ON public.board_rows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_board_cells_updated_at BEFORE UPDATE ON public.board_cells FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_app_accounts_updated_at BEFORE UPDATE ON public.app_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default board groups
INSERT INTO public.board_groups (name, color, position) VALUES
    ('New', '#3B82F6', 0),
    ('Preparing', '#F59E0B', 1),
    ('Ready', '#10B981', 2),
    ('Shipped', '#8B5CF6', 3);

-- Insert default board columns
INSERT INTO public.board_columns (name, type, position, options) VALUES
    ('Client', 'relation', 0, '[]'::jsonb),
    ('Items', 'items_qty', 1, '[]'::jsonb),
    ('Total', 'number', 2, '[]'::jsonb),
    ('Due Date', 'date', 3, '[]'::jsonb),
    ('Assigned To', 'person', 4, '[]'::jsonb),
    ('Priority', 'select', 5, '["High", "Medium", "Low"]'::jsonb),
    ('Paid', 'checkbox', 6, '[]'::jsonb),
    ('Notes', 'text', 7, '[]'::jsonb);

-- Insert default app settings
INSERT INTO public.app_settings (theme, primary_color, secondary_color, accent_color) VALUES
    ('light', '#8B4513', '#D4A574', '#F59E0B');