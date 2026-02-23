
-- Inventory counting sessions
CREATE TABLE public.inventory_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed
  assigned_employee_id UUID REFERENCES public.employees(id),
  completed_by_employee_id UUID REFERENCES public.employees(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Items within a session with consumption tracking
CREATE TABLE public.inventory_session_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.inventory_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  consumption_qty NUMERIC DEFAULT 0,
  reason TEXT DEFAULT 'consumption',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_session_items ENABLE ROW LEVEL SECURITY;

-- RLS for inventory_sessions
CREATE POLICY "Admins can manage inventory_sessions"
ON public.inventory_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view inventory_sessions"
ON public.inventory_sessions FOR SELECT
USING (true);

CREATE POLICY "Assigned employee can update inventory_sessions"
ON public.inventory_sessions FOR UPDATE
USING (assigned_employee_id = get_employee_id_for_user(auth.uid()));

-- RLS for inventory_session_items
CREATE POLICY "Admins can manage inventory_session_items"
ON public.inventory_session_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view inventory_session_items"
ON public.inventory_session_items FOR SELECT
USING (true);

CREATE POLICY "Assigned employee can insert session items"
ON public.inventory_session_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inventory_sessions s
    WHERE s.id = session_id
    AND s.assigned_employee_id = get_employee_id_for_user(auth.uid())
  )
);

CREATE POLICY "Assigned employee can update session items"
ON public.inventory_session_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.inventory_sessions s
    WHERE s.id = session_id
    AND s.assigned_employee_id = get_employee_id_for_user(auth.uid())
  )
);

-- Trigger for updated_at on sessions
CREATE TRIGGER update_inventory_sessions_updated_at
BEFORE UPDATE ON public.inventory_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
