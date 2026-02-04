-- Add profile_id to employees table to link employees with user accounts
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_profile_id ON public.employees(profile_id);

-- Add DELETE policy for profiles (admins can delete/revoke users)
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add UPDATE policy for admins to manage all profiles
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));