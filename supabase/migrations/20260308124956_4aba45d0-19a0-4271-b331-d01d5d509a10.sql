
CREATE TABLE public.shipping_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.shipping_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage shipping customers"
ON public.shipping_customers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
