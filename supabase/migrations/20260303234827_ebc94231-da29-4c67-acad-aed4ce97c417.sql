
-- Create a function that sends ntfy notifications via the edge function
CREATE OR REPLACE FUNCTION public.notify_ntfy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ntfy_url text;
  ntfy_topic text;
BEGIN
  -- Get secrets
  ntfy_url := current_setting('app.settings.ntfy_url', true);
  ntfy_topic := current_setting('app.settings.ntfy_topic', true);
  
  -- Send to ntfy using net extension if available, otherwise skip
  PERFORM net.http_post(
    url := ntfy_url || '/' || ntfy_topic,
    headers := jsonb_build_object(
      'Title', NEW.title,
      'Priority', 'default',
      'Tags', 'bell'
    ),
    body := COALESCE(NEW.message, NEW.title)
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the insert if ntfy fails
  RAISE WARNING 'ntfy notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
