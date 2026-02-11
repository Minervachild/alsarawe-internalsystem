
-- 1. Products table with aliases for Quick Add
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  origin text,
  default_price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Soft delete columns on board_rows
ALTER TABLE public.board_rows
  ADD COLUMN deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by uuid;

-- 3. Client logo_url
ALTER TABLE public.clients ADD COLUMN logo_url text;

-- 4. Overtime type (overtime vs off_day)
ALTER TABLE public.overtime ADD COLUMN type text NOT NULL DEFAULT 'overtime';
