-- Update the trigger function to prevent duplicate employee creation
-- When the edge function creates a profile and links it to an existing employee,
-- this trigger should NOT create a second employee record.
CREATE OR REPLACE FUNCTION public.handle_new_profile_employee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create employee if no employee is already linked to this profile
  -- This check handles both:
  -- 1. Profiles created via the edge function (which links to existing employees)
  -- 2. Race conditions where an employee was manually inserted with this profile_id
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
$function$;