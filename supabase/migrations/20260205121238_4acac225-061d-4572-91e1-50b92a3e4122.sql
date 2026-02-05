-- Fix: Board tables allow unrestricted data modification
-- Restrict write operations to admins or users with can_edit_columns permission
-- Allow all authenticated users to read data and add rows/cells

-- ============================================================
-- BOARD GROUPS - Restrict structure changes to editors
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage board_groups" ON public.board_groups;
DROP POLICY IF EXISTS "Authenticated can view board_groups" ON public.board_groups;

-- All authenticated users can read
CREATE POLICY "Authenticated can view board_groups" 
ON public.board_groups 
FOR SELECT 
TO authenticated
USING (true);

-- Only editors (admins or users with can_edit_columns) can modify
CREATE POLICY "Editors can insert board_groups" 
ON public.board_groups 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND can_edit_columns = true
  )
);

CREATE POLICY "Editors can update board_groups" 
ON public.board_groups 
FOR UPDATE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND can_edit_columns = true
  )
);

CREATE POLICY "Editors can delete board_groups" 
ON public.board_groups 
FOR DELETE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND can_edit_columns = true
  )
);

-- ============================================================
-- BOARD COLUMNS - Restrict structure changes to editors
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage board_columns" ON public.board_columns;
DROP POLICY IF EXISTS "Authenticated can view board_columns" ON public.board_columns;

-- All authenticated users can read
CREATE POLICY "Authenticated can view board_columns" 
ON public.board_columns 
FOR SELECT 
TO authenticated
USING (true);

-- Only editors can modify column structure
CREATE POLICY "Editors can insert board_columns" 
ON public.board_columns 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND can_edit_columns = true
  )
);

CREATE POLICY "Editors can update board_columns" 
ON public.board_columns 
FOR UPDATE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND can_edit_columns = true
  )
);

CREATE POLICY "Editors can delete board_columns" 
ON public.board_columns 
FOR DELETE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND can_edit_columns = true
  )
);

-- ============================================================
-- BOARD ROWS - Allow all users to add/edit orders, editors to delete
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage board_rows" ON public.board_rows;
DROP POLICY IF EXISTS "Authenticated can view board_rows" ON public.board_rows;

-- All authenticated users can read
CREATE POLICY "Authenticated can view board_rows" 
ON public.board_rows 
FOR SELECT 
TO authenticated
USING (true);

-- All authenticated users can add orders
CREATE POLICY "Authenticated can insert board_rows" 
ON public.board_rows 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- All authenticated users can update orders (move between groups, etc.)
CREATE POLICY "Authenticated can update board_rows" 
ON public.board_rows 
FOR UPDATE 
TO authenticated
USING (true);

-- Only editors can delete orders
CREATE POLICY "Editors can delete board_rows" 
ON public.board_rows 
FOR DELETE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND can_edit_columns = true
  )
);

-- ============================================================
-- BOARD CELLS - Allow all users to add/edit cell data, editors to delete
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage board_cells" ON public.board_cells;
DROP POLICY IF EXISTS "Authenticated can view board_cells" ON public.board_cells;

-- All authenticated users can read
CREATE POLICY "Authenticated can view board_cells" 
ON public.board_cells 
FOR SELECT 
TO authenticated
USING (true);

-- All authenticated users can add cell data
CREATE POLICY "Authenticated can insert board_cells" 
ON public.board_cells 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- All authenticated users can update cell data
CREATE POLICY "Authenticated can update board_cells" 
ON public.board_cells 
FOR UPDATE 
TO authenticated
USING (true);

-- Only editors can delete cells (typically cascades with row deletion)
CREATE POLICY "Editors can delete board_cells" 
ON public.board_cells 
FOR DELETE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND can_edit_columns = true
  )
);