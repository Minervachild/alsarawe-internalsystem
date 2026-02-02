-- Create shift_attendance table for tracking employee clock-in/out
CREATE TABLE public.shift_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_type text NOT NULL CHECK (shift_type IN ('first', 'second')),
  scheduled_start time NOT NULL,
  scheduled_end time NOT NULL,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  is_on_time boolean,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date, shift_type)
);

-- Enable RLS
ALTER TABLE public.shift_attendance ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated can manage shift_attendance" 
ON public.shift_attendance 
FOR ALL 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_shift_attendance_updated_at
BEFORE UPDATE ON public.shift_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add default shift schedules to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS shift_type text DEFAULT 'first',
ADD COLUMN IF NOT EXISTS shift_start time DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS shift_end time DEFAULT '16:00';