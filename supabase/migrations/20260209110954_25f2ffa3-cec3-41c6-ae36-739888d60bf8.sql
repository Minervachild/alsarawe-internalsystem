
-- 1. Rename "Paid" column to "Payment Status"
UPDATE public.board_columns SET name = 'Payment Status' WHERE id = 'c8eb21b1-7460-49b2-bf3a-ada211c5aad0';

-- 2. Add INSERT and UPDATE policies for saved_items (employees can add/edit items)
CREATE POLICY "Authenticated can insert saved_items"
ON public.saved_items
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated can update saved_items"
ON public.saved_items
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 3. Create branches table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view branches"
ON public.branches FOR SELECT
USING (true);

CREATE POLICY "Admins can manage branches"
ON public.branches FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Create branch_assignments table (link employees to branches)
CREATE TABLE public.branch_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, employee_id)
);

ALTER TABLE public.branch_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view branch_assignments"
ON public.branch_assignments FOR SELECT
USING (true);

CREATE POLICY "Admins can manage branch_assignments"
ON public.branch_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Create sales_entries table
CREATE TABLE public.sales_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  shift TEXT NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  submitted_by UUID NOT NULL,
  cash_amount NUMERIC NOT NULL,
  card_amount NUMERIC NOT NULL,
  transaction_count INTEGER NOT NULL,
  proof_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;

-- Employees can insert their own sales entries
CREATE POLICY "Authenticated can insert sales_entries"
ON public.sales_entries FOR INSERT
WITH CHECK (submitted_by = auth.uid());

-- Only admins can view all sales entries (write-only for employees)
CREATE POLICY "Admins can view sales_entries"
ON public.sales_entries FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update/delete
CREATE POLICY "Admins can manage sales_entries"
ON public.sales_entries FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. Create bot_register_templates table
CREATE TABLE public.bot_register_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.bot_register_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot_register_templates"
ON public.bot_register_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view bot_register_templates"
ON public.bot_register_templates FOR SELECT
USING (true);

-- Insert default template
INSERT INTO public.bot_register_templates (template_text)
VALUES ('مبيعات {branch} {date}

صندوق {cash} debit

{card_label} {card} debit

مبيعات المحل {total} credit');

-- 7. Create storage bucket for sales proof images
INSERT INTO storage.buckets (id, name, public) VALUES ('sales-proofs', 'sales-proofs', false);

-- Storage policies
CREATE POLICY "Authenticated can upload sales proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sales-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can view sales proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'sales-proofs' AND has_role(auth.uid(), 'admin'::app_role));

-- Also allow uploaders to view their own uploads (for form preview)
CREATE POLICY "Users can view own sales proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'sales-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
