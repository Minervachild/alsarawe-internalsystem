
-- Create a trigger function that auto-creates an employee when a new profile is created
-- This ensures that when a user signs up, they appear in the Employees section
CREATE OR REPLACE FUNCTION public.handle_new_profile_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create employee if no employee is already linked to this profile
  IF NOT EXISTS (SELECT 1 FROM employees WHERE profile_id = NEW.id) THEN
    INSERT INTO employees (name, profile_id, avatar_color, role)
    VALUES (
      NEW.username,
      NEW.id,
      COALESCE(NEW.avatar_color, '#8B4513'),
      'Team Member'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_create_employee ON public.profiles;
CREATE TRIGGER on_profile_created_create_employee
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_employee();
