-- Add price fields to inventory_movements for stock-in purchases
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0.15,
ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS consumption_date date;

-- Create index for faster average cycle calculation
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created 
ON public.inventory_movements(item_id, created_at);

-- Add last_refill_date and avg_days_to_refill to inventory_items for tracking
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS last_refill_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS avg_days_to_refill numeric;