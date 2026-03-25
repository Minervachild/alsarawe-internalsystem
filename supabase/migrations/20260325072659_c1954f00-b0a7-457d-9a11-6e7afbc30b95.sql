
-- Payment Collections table
CREATE TABLE public.payment_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  due_date date,
  invoice_url text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_collections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated can view payment_collections"
  ON public.payment_collections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert payment_collections"
  ON public.payment_collections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage payment_collections"
  ON public.payment_collections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own payment_collections"
  ON public.payment_collections FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Storage bucket for payment collection invoices
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-invoices', 'payment-invoices', false);

-- Storage policies for payment-invoices
CREATE POLICY "Authenticated can upload payment invoices"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-invoices');

CREATE POLICY "Authenticated can view payment invoices"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-invoices');
