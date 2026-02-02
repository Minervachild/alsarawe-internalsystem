-- Create duty categories table
CREATE TABLE public.duty_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create duties table
CREATE TABLE public.duties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.duty_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  role TEXT, -- e.g., 'barista', 'operating_lead', 'packaging'
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create duty completions table (logs when duties are completed)
CREATE TABLE public.duty_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  duty_id UUID NOT NULL REFERENCES public.duties(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.duty_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for duty_categories
CREATE POLICY "Authenticated can manage duty_categories"
ON public.duty_categories FOR ALL
USING (true);

-- RLS policies for duties
CREATE POLICY "Authenticated can manage duties"
ON public.duties FOR ALL
USING (true);

-- RLS policies for duty_completions
CREATE POLICY "Authenticated can manage duty_completions"
ON public.duty_completions FOR ALL
USING (true);

-- Insert default categories
INSERT INTO public.duty_categories (name, color, position) VALUES
('Cleaning & Hygiene', '#10B981', 0),
('Quality Control', '#8B5CF6', 1),
('Customer Service', '#F59E0B', 2),
('Products & Machines', '#3B82F6', 3);