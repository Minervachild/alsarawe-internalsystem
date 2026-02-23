-- Add moved_at column to track when an order was moved to its current section
ALTER TABLE public.board_rows ADD COLUMN moved_at timestamp with time zone DEFAULT now();

-- Backfill existing rows: use updated_at or created_at
UPDATE public.board_rows SET moved_at = COALESCE(updated_at, created_at, now());