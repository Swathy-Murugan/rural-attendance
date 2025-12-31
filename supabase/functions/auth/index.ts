import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple password hashing using Web Crypto API (compatible with Deno)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const data = encoder.encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Handle legacy plaintext passwords (for migration)
  if (!storedHash.includes(':')) {
    // This is a plaintext password - compare directly
    return password === storedHash;
  }
  
  const [saltHex, hashHex] = storedHash.split(':');
  const encoder = new TextEncoder();
  const data = encoder.encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return computedHash === hashHex;
}

// Generate a signed session token
async function generateSessionToken(userId: string, userType: 'student' | 'teacher'): Promise<string> {
  const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const timestamp = Date.now();
  const expiresAt = timestamp + (24 * 60 * 60 * 1000); // 24 hours
  
  const payload = JSON.stringify({ userId, userType, timestamp, expiresAt });
  const encoder = new TextEncoder();
  
  // Create HMAC signature
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Return base64 encoded token
  const token = btoa(JSON.stringify({ payload, signature: signatureHex }));
  return token;
}

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    
    const body = await req.json();

    switch (action) {
      case 'teacher-signup': {
        const { name, teacher_id, password, assigned_class } = body;
        
        // Validate inputs
        if (!name || !teacher_id || !password) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (password.length < 6) {
          return new Response(
            JSON.stringify({ error: 'Password must be at least 6 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if teacher ID exists
        const { data: existing } = await supabase
          .from('teachers')
          .select('id')
          .eq('teacher_id', teacher_id.toUpperCase())
          .maybeSingle();
        
        if (existing) {
          return new Response(
            JSON.stringify({ error: 'Teacher ID already registered' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Hash password
        const hashedPassword = await hashPassword(password);
        
        // Insert teacher
        const { data: newTeacher, error } = await supabase
          .from('teachers')
          .insert({
            name: name.trim(),
            teacher_id: teacher_id.toUpperCase(),
            password: hashedPassword,
            assigned_class: assigned_class?.trim() || null
          })
          .select('id, name, teacher_id, assigned_class')
          .single();
        
        if (error) {
          console.error('Teacher signup error:', error);
          return new Response(
            JSON.stringify({ error: 'Registration failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Generate session token
        const sessionToken = await generateSessionToken(newTeacher.id, 'teacher');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            user: newTeacher,
            sessionToken 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'teacher-signin': {
        const { teacher_id, password } = body;
        
        if (!teacher_id || !password) {
          return new Response(
            JSON.stringify({ error: 'Missing credentials' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data: teacher, error } = await supabase
          .from('teachers')
          .select('id, name, teacher_id, assigned_class, password')
          .eq('teacher_id', teacher_id.toUpperCase())
          .maybeSingle();
        
        if (error || !teacher) {
          return new Response(
            JSON.stringify({ error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const isValid = await verifyPassword(password, teacher.password);
        
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Generate session token
        const sessionToken = await generateSessionToken(teacher.id, 'teacher');
        
        // Don't return password
        const { password: _, ...userWithoutPassword } = teacher;
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            user: userWithoutPassword,
            sessionToken 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'student-signup': {
        const { name, studentClass, section, roll_number, school_name, password, qr_code } = body;
        
        // Validate inputs
        if (!name || !studentClass || !section || !roll_number || !school_name || !password) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (password.length < 6) {
          return new Response(
            JSON.stringify({ error: 'Password must be at least 6 characters' }),
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
        
        // Hash password
        const hashedPassword = await hashPassword(password);
        
        // Insert student
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert({
            name: name.trim(),
            class: studentClass.trim(),
            section: section.trim().toUpperCase(),
            roll_number: roll_number.trim(),
            school_name: school_name.trim(),
            password: hashedPassword,
            qr_code: qr_code || '',
            total_days: 0,
            present_days: 0,
            absent_days: 0
          })
          .select('id, name, class, section, roll_number, school_name')
          .single();
        
        if (error) {
          console.error('Student signup error:', error);
          return new Response(
            JSON.stringify({ error: 'Registration failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            user: newStudent 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'student-signin': {
        const { roll_number, password } = body;
        
        if (!roll_number || !password) {
          return new Response(
            JSON.stringify({ error: 'Missing credentials' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data: student, error } = await supabase
          .from('students')
          .select('id, name, class, section, roll_number, school_name, qr_code, password')
          .eq('roll_number', roll_number.trim())
          .maybeSingle();
        
        if (error || !student) {
          return new Response(
            JSON.stringify({ error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const isValid = await verifyPassword(password, student.password);
        
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Generate session token
        const sessionToken = await generateSessionToken(student.id, 'student');
        
        // Don't return password
        const { password: _, ...userWithoutPassword } = student;
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            user: userWithoutPassword,
            sessionToken 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'verify-session': {
        const { token } = body;
        
        if (!token) {
          return new Response(
            JSON.stringify({ valid: false }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const result = await verifySessionToken(token);
        
        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'update-qr-code': {
        const { student_id, qr_code } = body;
        
        if (!student_id || !qr_code) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { error } = await supabase
          .from('students')
          .update({ qr_code })
          .eq('id', student_id);
        
        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to update QR code' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true }),
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
    console.error('Auth function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
