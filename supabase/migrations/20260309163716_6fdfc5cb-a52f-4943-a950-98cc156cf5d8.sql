-- Add title column to daily_expenses
ALTER TABLE public.daily_expenses ADD COLUMN title text;

-- Create expense_templates table
CREATE TABLE public.expense_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  seller_id uuid REFERENCES public.expense_sellers(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.expense_accounts(id) ON DELETE SET NULL,
  payment_method_id uuid REFERENCES public.expense_payment_methods(id) ON DELETE SET NULL,
  default_amount numeric DEFAULT 0,
  vat_included boolean DEFAULT true,
  notes text,
  webhook_prompt_template text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.expense_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can manage expense_templates"
  ON public.expense_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- All authenticated can view templates
CREATE POLICY "Authenticated can view expense_templates"
  ON public.expense_templates FOR SELECT
  TO authenticated
  USING (true);