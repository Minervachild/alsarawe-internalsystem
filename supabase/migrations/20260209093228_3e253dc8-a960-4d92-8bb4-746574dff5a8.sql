-- Add target_days column to board_groups for editable cycle time target
ALTER TABLE public.board_groups
ADD COLUMN target_days integer DEFAULT 7;