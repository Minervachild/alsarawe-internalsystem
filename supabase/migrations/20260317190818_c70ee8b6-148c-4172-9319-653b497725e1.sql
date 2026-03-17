
-- Add paid_amount column to track partial payments
ALTER TABLE public.overtime ADD COLUMN paid_amount numeric NOT NULL DEFAULT 0;

-- Update existing paid entries to have paid_amount = amount
UPDATE public.overtime SET paid_amount = amount WHERE is_paid = true;
