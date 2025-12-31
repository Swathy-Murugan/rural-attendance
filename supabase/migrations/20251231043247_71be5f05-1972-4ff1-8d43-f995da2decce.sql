-- Add attendance counter columns to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS total_days INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS present_days INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS absent_days INTEGER NOT NULL DEFAULT 0;