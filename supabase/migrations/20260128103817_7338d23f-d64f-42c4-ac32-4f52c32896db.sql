-- Add reason column to inventory_movements for stock out tracking
ALTER TABLE public.inventory_movements 
ADD COLUMN reason text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.inventory_movements.reason IS 'Reason for stock out: spent (used for orders), waste, sample, adjustment, etc.';