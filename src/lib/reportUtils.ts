import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

interface AttendanceData {
  student_name: string;
  roll_number: string;
  class: string;
  section: string;
  date: string;
  entry_time: string | null;
  exit_time: string | null;
  status: string;
}

export const fetchAttendanceData = async (
  startDate: string,
  endDate: string
): Promise<AttendanceData[]> => {
  const teacherId = localStorage.getItem("teacherId");
  if (!teacherId) return [];

  // First get students added by this teacher only
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, name, roll_number, class, section")
    .eq("teacher_id", teacherId);

  if (studentsError) throw studentsError;
  if (!students || students.length === 0) return [];

  const studentIds = students.map(s => s.id);
  const studentMap = new Map(students.map(s => [s.id, s]));

  // Get attendance for these students only
  const { data: attendance, error } = await supabase
    .from("student_attendance")
    .select(`
      attendance_date,
      entry_time,
      exit_time,
      status,
      student_id
    `)
    .in("student_id", studentIds)
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate)
    .order("attendance_date", { ascending: true });

  if (error) throw error;

  return (attendance || []).map(a => {
    const student = studentMap.get(a.student_id)!;
    return {
      student_name: student.name,
      roll_number: student.roll_number,
      class: student.class,
      section: student.section,
      date: a.attendance_date,
      entry_time: a.entry_time,
      exit_time: a.exit_time,
      status: a.status
    };
  });
};

export const generateCSV = (data: AttendanceData[], title: string): string => {
  if (data.length === 0) {
    return "No attendance records found for the selected period.";
  }

  const headers = ["Date", "Student Name", "Roll No", "Class", "Section", "Entry Time", "Exit Time", "Status"];
  
  const rows = data.map(row => [
    row.date,
    row.student_name,
    row.roll_number,
    row.class,
    row.section,
    row.entry_time ? format(new Date(row.entry_time), "hh:mm a") : "-",
    row.exit_time ? format(new Date(row.exit_time), "hh:mm a") : "-",
    row.status === "complete" ? "Present" : row.status === "entry-only" ? "Entry Only" : "Absent"
  ]);

  const csvContent = [
    `# ${title}`,
    `# Generated on: ${format(new Date(), "PPP")}`,
    "",
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  return csvContent;
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const downloadDailyReport = async () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const data = await fetchAttendanceData(today, today);
  const csv = generateCSV(data, `Daily Attendance Report - ${format(new Date(), "PPP")}`);
  downloadCSV(csv, `daily-attendance-${today}.csv`);
  return data.length;
};

export const downloadWeeklyReport = async () => {
  const today = new Date();
  const start = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const end = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const data = await fetchAttendanceData(start, end);
  const csv = generateCSV(data, `Weekly Attendance Report - Week of ${format(new Date(start), "PPP")}`);
  downloadCSV(csv, `weekly-attendance-${start}-to-${end}.csv`);
  return data.length;
};

export const downloadMonthlyReport = async () => {
  const today = new Date();
  const start = format(startOfMonth(today), "yyyy-MM-dd");
  const end = format(endOfMonth(today), "yyyy-MM-dd");
  const data = await fetchAttendanceData(start, end);
  const csv = generateCSV(data, `Monthly Attendance Report - ${format(today, "MMMM yyyy")}`);
  downloadCSV(csv, `monthly-attendance-${format(today, "yyyy-MM")}.csv`);
  return data.length;
};

export const downloadMidDayMealReport = async () => {
  // Last 30 days for mid-day meal scheme
  const today = new Date();
  const start = format(subDays(today, 30), "yyyy-MM-dd");
  const end = format(today, "yyyy-MM-dd");
  const data = await fetchAttendanceData(start, end);
  
  // Filter only present students for mid-day meal
  const presentData = data.filter(d => d.status === "complete");
  
  // Group by date for meal count
  const mealCounts = new Map<string, number>();
  presentData.forEach(d => {
    mealCounts.set(d.date, (mealCounts.get(d.date) || 0) + 1);
  });

  const headers = ["Date", "Students Present", "Meals Served"];
  const rows = Array.from(mealCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => [date, count.toString(), count.toString()]);

  const totalMeals = Array.from(mealCounts.values()).reduce((sum, count) => sum + count, 0);

  const csvContent = [
    "# Mid-Day Meal Scheme Report",
    `# Generated on: ${format(new Date(), "PPP")}`,
    `# Period: ${format(new Date(start), "PPP")} to ${format(new Date(end), "PPP")}`,
    `# Total Meals Served: ${totalMeals}`,
    "",
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  downloadCSV(csvContent, `midday-meal-report-${format(today, "yyyy-MM")}.csv`);
  return totalMeals;
};

export const getAttendanceStats = async () => {
  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");
  
  const data = await fetchAttendanceData(monthStart, monthEnd);
  
  const uniqueDates = new Set(data.map(d => d.date));
  const workingDays = uniqueDates.size;
  
  const presentRecords = data.filter(d => d.status === "complete").length;
  const totalRecords = data.length;
  
  const averageAttendance = totalRecords > 0 
    ? Math.round((presentRecords / totalRecords) * 100) 
    : 0;

  // Find students with low attendance
  const studentAttendance = new Map<string, { name: string; present: number; total: number }>();
  
  data.forEach(d => {
    const key = d.roll_number;
    if (!studentAttendance.has(key)) {
      studentAttendance.set(key, { name: d.student_name, present: 0, total: 0 });
    }
    const student = studentAttendance.get(key)!;
    student.total++;
    if (d.status === "complete") student.present++;
  });

  const lowAttendanceStudents = Array.from(studentAttendance.entries())
    .map(([roll, data]) => ({
      name: data.name,
      rollNumber: roll,
      percentage: Math.round((data.present / data.total) * 100),
      present: data.present,
      total: data.total
    }))
    .filter(s => s.percentage < 75)
    .sort((a, b) => a.percentage - b.percentage);

  return {
    averageAttendance,
    workingDays,
    lowAttendanceStudents
  };
};
