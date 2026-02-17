
-- Junction table to assign duties to specific employees
CREATE TABLE public.duty_employee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_id uuid NOT NULL REFERENCES public.duties(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(duty_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.duty_employee_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage duty_employee_assignments"
ON public.duty_employee_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated can view
CREATE POLICY "Authenticated can view duty_employee_assignments"
ON public.duty_employee_assignments
FOR SELECT
USING (true);
