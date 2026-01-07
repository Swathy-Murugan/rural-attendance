import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS with allowed origins whitelist
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

// Check if origin matches Lovable preview pattern
function isLovablePreview(origin: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin) ||
         /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    isLovablePreview(origin)
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Verify session token
async function verifySessionToken(token: string): Promise<{ valid: boolean; userId?: string; userType?: string }> {
  try {
    const decoded = JSON.parse(atob(token));
    const { payload, signature } = decoded;
    const parsedPayload = JSON.parse(payload);
    
    // Check expiration
    if (parsedPayload.expiresAt < Date.now()) {
      return { valid: false };
    }
    
    const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBytes = new Uint8Array(
      signature.match(/.{2}/g).map((byte: string) => parseInt(byte, 16))
    );
    
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payload));
    
    if (valid) {
      return { valid: true, userId: parsedPayload.userId, userType: parsedPayload.userType };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const sessionToken = authHeader?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const session = await verifySessionToken(sessionToken);
    if (!session.valid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    
    const body = await req.json().catch(() => ({}));

    switch (action) {
      case 'get-students': {
        // Teachers can only get their own students
        if (session.userType !== 'teacher') {
          return new Response(
            JSON.stringify({ error: 'Only teachers can access this endpoint' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data, error } = await supabase
          .from('students')
          .select('id, name, roll_number, class, section, school_name, teacher_id, present_days, absent_days, total_days')
          .eq('teacher_id', session.userId)
          .order('roll_number');
        
        if (error) {
          console.error('Get students error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch students' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'get-attendance': {
        const { date } = body;
        const attendanceDate = date || new Date().toISOString().split('T')[0];
        
        if (session.userType === 'teacher') {
          // Get attendance for teacher's students
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .eq('teacher_id', session.userId);
          
          const studentIds = students?.map(s => s.id) || [];
          
          if (studentIds.length === 0) {
            return new Response(
              JSON.stringify({ success: true, data: [] }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const { data, error } = await supabase
            .from('student_attendance')
            .select('*')
            .eq('attendance_date', attendanceDate)
            .in('student_id', studentIds);
          
          if (error) {
            console.error('Get attendance error:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch attendance' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(
            JSON.stringify({ success: true, data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Students can only see their own attendance
          const { data, error } = await supabase
            .from('student_attendance')
            .select('*')
            .eq('student_id', session.userId)
            .eq('attendance_date', attendanceDate);
          
          if (error) {
            console.error('Get attendance error:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch attendance' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(
            JSON.stringify({ success: true, data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      case 'mark-attendance': {
        if (session.userType !== 'teacher') {
          return new Response(
            JSON.stringify({ error: 'Only teachers can mark attendance' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { student_id, status, type } = body;
        
        if (!student_id || !status) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Verify student belongs to this teacher
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id, name, teacher_id, present_days, absent_days, total_days')
          .eq('id', student_id)
          .single();
        
        if (studentError || !student || student.teacher_id !== session.userId) {
          return new Response(
            JSON.stringify({ error: 'Student not found or not assigned to you' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();
        const attendanceType = type || 'entry';
        
        // Check for existing record
        const { data: existing } = await supabase
          .from('student_attendance')
          .select('*')
          .eq('student_id', student_id)
          .eq('attendance_date', today)
          .maybeSingle();
        
        if (existing) {
          // Update existing record
          if (attendanceType === 'entry' && existing.entry_time) {
            return new Response(
              JSON.stringify({ error: 'Entry already marked', student_name: student.name }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (attendanceType === 'exit' && existing.exit_time) {
            return new Response(
              JSON.stringify({ error: 'Exit already marked', student_name: student.name }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const updateData: Record<string, unknown> = {
            marked_by: session.userId,
            synced: true
          };
          
          if (attendanceType === 'entry') {
            updateData.entry_time = now;
            updateData.status = status === 'absent' ? 'absent' : 'entry-only';
          } else {
            updateData.exit_time = now;
            updateData.status = existing.entry_time ? 'complete' : 'exit-only';
          }
          
          const { error: updateError } = await supabase
            .from('student_attendance')
            .update(updateData)
            .eq('id', existing.id);
          
          if (updateError) {
            console.error('Update attendance error:', updateError);
            return new Response(
              JSON.stringify({ error: 'Failed to update attendance' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // Create new record
          const insertData = {
            student_id,
            attendance_date: today,
            marked_by: session.userId,
            synced: true,
            status: status === 'absent' ? 'absent' : (attendanceType === 'entry' ? 'entry-only' : 'exit-only'),
            entry_time: attendanceType === 'entry' && status === 'present' ? now : null,
            exit_time: attendanceType === 'exit' ? now : null
          };
          
          const { error: insertError } = await supabase
            .from('student_attendance')
            .insert(insertData);
          
          if (insertError) {
            console.error('Insert attendance error:', insertError);
            return new Response(
              JSON.stringify({ error: 'Failed to mark attendance' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Update student counts for new records
          const updateCounts: Record<string, number> = {
            total_days: (student.total_days || 0) + 1
          };
          
          if (status === 'present') {
            updateCounts.present_days = (student.present_days || 0) + 1;
          } else {
            updateCounts.absent_days = (student.absent_days || 0) + 1;
          }
          
          await supabase
            .from('students')
            .update(updateCounts)
            .eq('id', student_id);
        }
        
        return new Response(
          JSON.stringify({ success: true, message: `${student.name} - ${attendanceType} marked as ${status}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'edit-attendance': {
        if (session.userType !== 'teacher') {
          return new Response(
            JSON.stringify({ error: 'Only teachers can edit attendance' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { student_id, new_status } = body;
        
        if (!student_id || !new_status) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Verify student belongs to this teacher
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id, name, teacher_id, present_days, absent_days')
          .eq('id', student_id)
          .single();
        
        if (studentError || !student || student.teacher_id !== session.userId) {
          return new Response(
            JSON.stringify({ error: 'Student not found or not assigned to you' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();
        
        // Get existing record
        const { data: existing } = await supabase
          .from('student_attendance')
          .select('*')
          .eq('student_id', student_id)
          .eq('attendance_date', today)
          .maybeSingle();
        
        if (!existing) {
          return new Response(
            JSON.stringify({ error: 'No attendance record found for today' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const isCurrentlyAbsent = existing.status === 'absent';
        const isCurrentlyPresent = ['entry-only', 'complete', 'exit-only'].includes(existing.status);
        
        // Prevent no-op changes
        if ((new_status === 'absent' && isCurrentlyAbsent) || 
            (new_status === 'present' && isCurrentlyPresent)) {
          return new Response(
            JSON.stringify({ error: `Student is already marked as ${new_status}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const updateData: Record<string, unknown> = {
          marked_by: session.userId,
          synced: true
        };
        
        if (new_status === 'present') {
          updateData.status = 'entry-only';
          updateData.entry_time = now;
          updateData.exit_time = null;
        } else {
          updateData.status = 'absent';
          updateData.entry_time = null;
          updateData.exit_time = null;
        }
        
        const { error: attendanceError } = await supabase
          .from('student_attendance')
          .update(updateData)
          .eq('id', existing.id);
        
        if (attendanceError) {
          console.error('Edit attendance error:', attendanceError);
          return new Response(
            JSON.stringify({ error: 'Failed to update attendance' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Update student counts
        let newPresentDays = student.present_days || 0;
        let newAbsentDays = student.absent_days || 0;
        
        if (isCurrentlyAbsent && new_status === 'present') {
          newPresentDays += 1;
          newAbsentDays = Math.max(0, newAbsentDays - 1);
        } else if (isCurrentlyPresent && new_status === 'absent') {
          newPresentDays = Math.max(0, newPresentDays - 1);
          newAbsentDays += 1;
        }
        
        await supabase
          .from('students')
          .update({ present_days: newPresentDays, absent_days: newAbsentDays })
          .eq('id', student_id);
        
        return new Response(
          JSON.stringify({ success: true, message: `${student.name}'s attendance changed to ${new_status}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'add-student': {
        if (session.userType !== 'teacher') {
          return new Response(
            JSON.stringify({ error: 'Only teachers can add students' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { name, roll_number, class: studentClass, section, school_name } = body;
        
        if (!name || !roll_number || !studentClass || !section || !school_name) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if roll number exists
        const { data: existing } = await supabase
          .from('students')
          .select('id')
          .eq('roll_number', roll_number.trim())
          .maybeSingle();
        
        if (existing) {
          return new Response(
            JSON.stringify({ error: 'A student with this roll number already exists' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Simple password hashing for default password
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
        const data = encoder.encode(saltHex + '123456');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const hashedPassword = `${saltHex}:${hashHex}`;
        
        const { error } = await supabase
          .from('students')
          .insert({
            name: name.trim(),
            roll_number: roll_number.trim(),
            class: studentClass.trim(),
            section: section.trim().toUpperCase(),
            school_name: school_name.trim(),
            teacher_id: session.userId,
            password: hashedPassword,
            qr_code: '',
            total_days: 0,
            present_days: 0,
            absent_days: 0
          });
        
        if (error) {
          console.error('Add student error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to add student' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true, message: `${name} added successfully` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'remove-student': {
        if (session.userType !== 'teacher') {
          return new Response(
            JSON.stringify({ error: 'Only teachers can remove students' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { student_id } = body;
        
        if (!student_id) {
          return new Response(
            JSON.stringify({ error: 'Missing student_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Verify student belongs to this teacher
        const { data: student } = await supabase
          .from('students')
          .select('id, teacher_id')
          .eq('id', student_id)
          .single();
        
        if (!student || student.teacher_id !== session.userId) {
          return new Response(
            JSON.stringify({ error: 'Student not found or not assigned to you' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { error } = await supabase
          .from('students')
          .update({ teacher_id: null })
          .eq('id', student_id);
        
        if (error) {
          console.error('Remove student error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to remove student' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true, message: 'Student removed from your list' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'get-student-profile': {
        if (session.userType !== 'student') {
          return new Response(
            JSON.stringify({ error: 'Only students can access this endpoint' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data, error } = await supabase
          .from('students')
          .select('id, name, roll_number, class, section, school_name, present_days, absent_days, total_days, scholarship_eligible, qr_code')
          .eq('id', session.userId)
          .single();
        
        if (error || !data) {
          return new Response(
            JSON.stringify({ error: 'Student not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'get-student-attendance-history': {
        if (session.userType !== 'student') {
          return new Response(
            JSON.stringify({ error: 'Only students can access this endpoint' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { limit = 30 } = body;
        
        const { data, error } = await supabase
          .from('student_attendance')
          .select('*')
          .eq('student_id', session.userId)
          .order('attendance_date', { ascending: false })
          .limit(limit);
        
        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch attendance history' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Data function error:', error);
    const corsHeaders = getCorsHeaders(req.headers.get('origin'));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
