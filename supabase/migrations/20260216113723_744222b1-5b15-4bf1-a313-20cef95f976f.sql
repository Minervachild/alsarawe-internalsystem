
-- Create user_page_access table
-- If a user has NO entries here, they can see all pages (backward compatible)
-- If entries exist, they can ONLY see listed pages
-- Admins always bypass this restriction
CREATE TABLE public.user_page_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  page text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, page)
);

-- Enable RLS
ALTER TABLE public.user_page_access ENABLE ROW LEVEL SECURITY;

-- Admins can manage all access
CREATE POLICY "Admins can manage page access"
ON public.user_page_access
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own page access
CREATE POLICY "Users can view own page access"
ON public.user_page_access
FOR SELECT
USING (user_id = auth.uid());
