-- Add teacher_id to students table for teacher-controlled student lists
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL;

-- Add password_reset_token and password_reset_expires columns for forgot password
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS password_reset_token text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS password_reset_expires timestamp with time zone;

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS password_reset_token text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS password_reset_expires timestamp with time zone;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON public.students(class, section);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.student_attendance(student_id, attendance_date);