
-- Allow authenticated users to insert inventory_movements (for session completion)
CREATE POLICY "Authenticated can insert inventory_movements"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to update inventory_items stock (for session completion)
CREATE POLICY "Authenticated can update inventory_items stock"
  ON public.inventory_items FOR UPDATE
  USING (true)
  WITH CHECK (true);
