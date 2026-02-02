-- Add rating and reason columns to duty_completions
ALTER TABLE public.duty_completions 
ADD COLUMN rating INTEGER CHECK (rating >= 0 AND rating <= 5),
ADD COLUMN reason TEXT;