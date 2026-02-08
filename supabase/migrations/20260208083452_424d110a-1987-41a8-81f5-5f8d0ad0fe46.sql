
-- ============================================
-- Quality Check System Tables
-- ============================================

-- Sections (e.g., Retail, B2B)
CREATE TABLE public.quality_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items within sections (e.g., "Coffee of the Day" in Retail)
CREATE TABLE public.quality_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.quality_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle_days INT NOT NULL DEFAULT 7,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Review criteria templates per item (e.g., Taste, Speed of Service, Cup)
CREATE TABLE public.quality_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.quality_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Actual quality reviews performed
CREATE TABLE public.quality_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.quality_items(id) ON DELETE CASCADE,
  performed_by UUID REFERENCES public.employees(id),
  notes TEXT,
  improvement_target TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual ratings per criteria within a review
CREATE TABLE public.quality_review_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.quality_reviews(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.quality_criteria(id) ON DELETE CASCADE,
  rating INT NOT NULL DEFAULT 3,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rating validation trigger (1-5 range)
CREATE OR REPLACE FUNCTION public.validate_quality_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_quality_review_rating
BEFORE INSERT OR UPDATE ON public.quality_review_ratings
FOR EACH ROW EXECUTE FUNCTION public.validate_quality_rating();

-- Updated_at triggers
CREATE TRIGGER update_quality_sections_updated_at
BEFORE UPDATE ON public.quality_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quality_items_updated_at
BEFORE UPDATE ON public.quality_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.quality_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_review_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies: All authenticated users can read, only admins can manage structure
CREATE POLICY "Authenticated users can view quality sections"
ON public.quality_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage quality sections"
ON public.quality_sections FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view quality items"
ON public.quality_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage quality items"
ON public.quality_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view quality criteria"
ON public.quality_criteria FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage quality criteria"
ON public.quality_criteria FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view quality reviews"
ON public.quality_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create quality reviews"
ON public.quality_reviews FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view quality review ratings"
ON public.quality_review_ratings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create quality review ratings"
ON public.quality_review_ratings FOR INSERT TO authenticated WITH CHECK (true);

-- Seed default sections
INSERT INTO public.quality_sections (name, position) VALUES
  ('Retail', 0),
  ('B2B', 1);
