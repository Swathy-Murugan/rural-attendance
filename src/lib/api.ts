import { getSessionToken } from "./auth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://xwjaeyeakfquwwdkwfat.supabase.co";

interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
}

async function apiCall<T = unknown>(
  endpoint: string, 
  action: string, 
  body: Record<string, unknown> = {}
): Promise<ApiResponse<T>> {
  const token = getSessionToken();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  
  return response.json();
}

// Student data operations
export async function getStudents() {
  return apiCall<Array<{
    id: string;
    name: string;
    roll_number: string;
    class: string;
    section: string;
    school_name: string;
    teacher_id?: string;
    present_days?: number;
    absent_days?: number;
    total_days?: number;
  }>>('data', 'get-students');
}

export async function getAttendance(date?: string) {
  return apiCall<Array<{
    id: string;
    student_id: string;
    attendance_date: string;
    entry_time: string | null;
    exit_time: string | null;
    status: string;
    marked_by: string | null;
    synced: boolean;
  }>>('data', 'get-attendance', date ? { date } : {});
}

export async function markAttendance(studentId: string, status: 'present' | 'absent', type: 'entry' | 'exit' = 'entry') {
  return apiCall('data', 'mark-attendance', {
    student_id: studentId,
    status,
    type
  });
}

export async function editAttendance(studentId: string, newStatus: 'present' | 'absent') {
  return apiCall('data', 'edit-attendance', {
    student_id: studentId,
    new_status: newStatus
  });
}

export async function addStudent(studentData: {
  name: string;
  roll_number: string;
  class: string;
  section: string;
  school_name: string;
}) {
  return apiCall('data', 'add-student', studentData);
}

export async function removeStudent(studentId: string) {
  return apiCall('data', 'remove-student', { student_id: studentId });
}

export async function getStudentProfile() {
  return apiCall<{
    id: string;
    name: string;
    roll_number: string;
    class: string;
    section: string;
    school_name: string;
    present_days: number;
    absent_days: number;
    total_days: number;
    scholarship_eligible: boolean;
    qr_code: string;
  }>('data', 'get-student-profile');
}

export async function getStudentAttendanceHistory(limit = 30) {
  return apiCall<Array<{
    id: string;
    attendance_date: string;
    entry_time: string | null;
    exit_time: string | null;
    status: string;
  }>>('data', 'get-student-attendance-history', { limit });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiCall('auth', 'change-password', {
    current_password: currentPassword,
    new_password: newPassword
  });
}
