
ALTER TABLE public.bot_register_templates 
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'sales';
