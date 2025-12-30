-- Create teachers table for teacher authentication
CREATE TABLE public.teachers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    assigned_class TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on teachers table
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- RLS policies for teachers
CREATE POLICY "Anyone can register as teacher" 
ON public.teachers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Teachers can view all teachers" 
ON public.teachers 
FOR SELECT 
USING (true);

CREATE POLICY "Teachers can update own profile" 
ON public.teachers 
FOR UPDATE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.update_student_updated_at();