
-- Add new columns to duties table
ALTER TABLE public.duties ADD COLUMN IF NOT EXISTS is_end_of_day boolean NOT NULL DEFAULT false;
ALTER TABLE public.duties ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT true;
ALTER TABLE public.duties ADD COLUMN IF NOT EXISTS target_date date NULL;

-- Add index for efficient querying of one-off tasks by date
CREATE INDEX IF NOT EXISTS idx_duties_target_date ON public.duties (target_date) WHERE target_date IS NOT NULL;

-- Add index for role-based filtering
CREATE INDEX IF NOT EXISTS idx_duties_role ON public.duties (role);
