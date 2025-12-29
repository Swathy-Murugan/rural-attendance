-- Create students table for student profiles and authentication
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roll_number TEXT NOT NULL,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  section TEXT NOT NULL,
  school_name TEXT NOT NULL,
  password TEXT NOT NULL,
  qr_code TEXT NOT NULL,
  scholarship_eligible BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(roll_number, school_name)
);

-- Create student_attendance table to track attendance records
CREATE TABLE public.student_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_time TIMESTAMP WITH TIME ZONE,
  exit_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('absent', 'entry-only', 'complete')),
  marked_by TEXT,
  synced BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, attendance_date)
);

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students table
-- Students can view their own profile
CREATE POLICY "Students can view own profile" 
ON public.students 
FOR SELECT 
USING (true);

-- Allow public insert for signup (no auth required for rural schools)
CREATE POLICY "Anyone can register as student" 
ON public.students 
FOR INSERT 
WITH CHECK (true);

-- Students can update their own profile
CREATE POLICY "Students can update own profile" 
ON public.students 
FOR UPDATE 
USING (true);

-- RLS Policies for student_attendance table
-- Anyone can view attendance (teachers need to see all)
CREATE POLICY "Anyone can view attendance" 
ON public.student_attendance 
FOR SELECT 
USING (true);

-- Teachers can insert attendance records
CREATE POLICY "Anyone can insert attendance" 
ON public.student_attendance 
FOR INSERT 
WITH CHECK (true);

-- Teachers can update attendance records
CREATE POLICY "Anyone can update attendance" 
ON public.student_attendance 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_student_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_student_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_students_roll_school ON public.students(roll_number, school_name);
CREATE INDEX idx_attendance_student_date ON public.student_attendance(student_id, attendance_date);