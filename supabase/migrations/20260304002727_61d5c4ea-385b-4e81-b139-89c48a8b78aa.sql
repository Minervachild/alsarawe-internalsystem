
-- Expense sellers (repeatable vendors)
CREATE TABLE public.expense_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view expense_sellers" ON public.expense_sellers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert expense_sellers" ON public.expense_sellers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage expense_sellers" ON public.expense_sellers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Expense accounts (COGS, operating, etc.)
CREATE TABLE public.expense_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view expense_accounts" ON public.expense_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert expense_accounts" ON public.expense_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage expense_accounts" ON public.expense_accounts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Expense payment methods
CREATE TABLE public.expense_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view expense_payment_methods" ON public.expense_payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert expense_payment_methods" ON public.expense_payment_methods FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage expense_payment_methods" ON public.expense_payment_methods FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Daily expenses
CREATE TABLE public.daily_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES public.expense_sellers(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.expense_accounts(id) ON DELETE SET NULL,
  payment_method_id uuid REFERENCES public.expense_payment_methods(id) ON DELETE SET NULL,
  invoice_number text,
  amount numeric NOT NULL DEFAULT 0,
  vat_included boolean NOT NULL DEFAULT true,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view daily_expenses" ON public.daily_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert daily_expenses" ON public.daily_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage daily_expenses" ON public.daily_expenses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own daily_expenses" ON public.daily_expenses FOR DELETE TO authenticated USING (created_by = auth.uid());
