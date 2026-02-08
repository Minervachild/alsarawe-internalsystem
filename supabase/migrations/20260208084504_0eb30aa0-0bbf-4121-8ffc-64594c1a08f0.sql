
-- Defense-in-depth: Restrict employees_public view access to authenticated users only.
-- The view already has a WHERE clause using auth.uid() for row-level filtering,
-- and it excludes sensitive columns (email, phone, hourly_rate, off_day_rate).
-- This REVOKE adds an extra layer ensuring unauthenticated (anon) users cannot query it at all.
REVOKE ALL ON public.employees_public FROM anon;
GRANT SELECT ON public.employees_public TO authenticated;
