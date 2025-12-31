import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://xwjaeyeakfquwwdkwfat.supabase.co";

interface AuthResponse {
  success?: boolean;
  error?: string;
  user?: {
    id: string;
    name: string;
    [key: string]: unknown;
  };
  sessionToken?: string;
}

// Teacher Authentication
export async function teacherSignUp(data: {
  name: string;
  teacher_id: string;
  password: string;
  assigned_class?: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth/teacher-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return response.json();
}

export async function teacherSignIn(data: {
  teacher_id: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth/teacher-signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return response.json();
}

// Student Authentication
export async function studentSignUp(data: {
  name: string;
  studentClass: string;
  section: string;
  roll_number: string;
  school_name: string;
  password: string;
  qr_code?: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth/student-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return response.json();
}

export async function studentSignIn(data: {
  roll_number: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth/student-signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return response.json();
}

// Session Management
export async function verifySession(token: string): Promise<{ valid: boolean; userId?: string; userType?: string }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth/verify-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  
  return response.json();
}

export async function updateStudentQRCode(studentId: string, qrCode: string): Promise<{ success?: boolean; error?: string }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth/update-qr-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ student_id: studentId, qr_code: qrCode }),
  });
  
  return response.json();
}

// Session token storage
const SESSION_TOKEN_KEY = 'sessionToken';
const USER_TYPE_KEY = 'userType';

export function saveSession(token: string, userType: 'student' | 'teacher'): void {
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  sessionStorage.setItem(USER_TYPE_KEY, userType);
}

export function getSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function getUserType(): string | null {
  return sessionStorage.getItem(USER_TYPE_KEY);
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(USER_TYPE_KEY);
  // Also clear legacy localStorage items
  localStorage.removeItem('teacherLoggedIn');
  localStorage.removeItem('teacherId');
  localStorage.removeItem('teacherName');
  localStorage.removeItem('teacherClass');
  localStorage.removeItem('studentLoggedIn');
  localStorage.removeItem('studentId');
  localStorage.removeItem('studentName');
  localStorage.removeItem('studentClass');
  localStorage.removeItem('studentSection');
  localStorage.removeItem('studentRollNumber');
  localStorage.removeItem('studentSchool');
}

export async function isAuthenticated(): Promise<boolean> {
  const token = getSessionToken();
  if (!token) return false;
  
  const result = await verifySession(token);
  return result.valid;
}
