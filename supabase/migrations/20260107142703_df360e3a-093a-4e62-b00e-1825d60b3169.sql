-- Drop all existing overly permissive RLS policies
DROP POLICY IF EXISTS "Anyone can register as student" ON students;
DROP POLICY IF EXISTS "Students can update own profile" ON students;
DROP POLICY IF EXISTS "Students can view own profile" ON students;

DROP POLICY IF EXISTS "Anyone can insert attendance" ON student_attendance;
DROP POLICY IF EXISTS "Anyone can update attendance" ON student_attendance;
DROP POLICY IF EXISTS "Anyone can view attendance" ON student_attendance;

DROP POLICY IF EXISTS "Anyone can register as teacher" ON teachers;
DROP POLICY IF EXISTS "Teachers can update own profile" ON teachers;
DROP POLICY IF EXISTS "Teachers can view all teachers" ON teachers;

-- Create restrictive policies that block all public access
-- All operations must go through edge functions with service role key

-- Students table: No public access (service role bypasses RLS)
CREATE POLICY "No public read access to students"
ON students FOR SELECT
TO public
USING (false);

CREATE POLICY "No public insert to students"
ON students FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "No public update to students"
ON students FOR UPDATE
TO public
USING (false);

-- Student Attendance table: No public access
CREATE POLICY "No public read access to attendance"
ON student_attendance FOR SELECT
TO public
USING (false);

CREATE POLICY "No public insert to attendance"
ON student_attendance FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "No public update to attendance"
ON student_attendance FOR UPDATE
TO public
USING (false);

-- Teachers table: No public access
CREATE POLICY "No public read access to teachers"
ON teachers FOR SELECT
TO public
USING (false);

CREATE POLICY "No public insert to teachers"
ON teachers FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "No public update to teachers"
ON teachers FOR UPDATE
TO public
USING (false);