import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { getSessionToken, verifySession, clearSession } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  entry_time: string | null;
  exit_time: string | null;
  status: string;
}

interface StudentInfo {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  section: string;
}

const AttendanceHistory = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get("studentId");
  
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchDate, setSearchDate] = useState("");
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0, percentage: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      const token = getSessionToken();
      if (!token) {
        navigate("/login");
        return;
      }
      const result = await verifySession(token);
      if (!result.valid) {
        clearSession();
        navigate("/login");
        return;
      }
      fetchData();
    };
    checkAuth();
  }, [navigate, studentIdParam]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Determine which student to show
      let targetStudentId = studentIdParam;
      if (!targetStudentId) {
        // If no param, show logged-in student's history
        targetStudentId = localStorage.getItem("studentId");
      }

      if (!targetStudentId) {
        navigate("/dashboard");
        return;
      }

      // Fetch student info
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, name, roll_number, class, section")
        .eq("id", targetStudentId)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      // Fetch attendance for current month
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("student_id", targetStudentId)
        .gte("attendance_date", start)
        .lte("attendance_date", end)
        .order("attendance_date", { ascending: false });

      if (attendanceError) throw attendanceError;
      setAttendance(attendanceData || []);

      // Calculate stats
      const present = attendanceData?.filter(a => a.status === "complete").length || 0;
      const absent = attendanceData?.filter(a => a.status === "absent").length || 0;
      const total = attendanceData?.length || 0;
      
      setStats({
        present,
        absent,
        total,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0
      });
    } catch (error) {
      handleError(error, "Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "entry-only":
        return <Clock className="w-5 h-5 text-warning" />;
      default:
        return <XCircle className="w-5 h-5 text-destructive" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "complete": return "Present (Verified)";
      case "entry-only": return "Entry Only";
      case "exit-only": return "Exit Only";
      default: return "Absent";
    }
  };

  const filteredAttendance = searchDate
    ? attendance.filter(a => a.attendance_date.includes(searchDate))
    : attendance;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button 
            variant="secondary" 
            size="icon"
            onClick={() => navigate(-1)}
            className="h-12 w-12"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Attendance History</h1>
            {student && (
              <p className="text-sm opacity-90">
                {student.name} • Roll No: {student.roll_number} • Class {student.class}-{student.section}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="p-4 bg-primary text-primary-foreground text-center">
            <p className="text-3xl font-bold">{stats.percentage}%</p>
            <p className="text-xs opacity-90">Attendance</p>
          </Card>
          <Card className="p-4 bg-success text-success-foreground text-center">
            <p className="text-3xl font-bold">{stats.present}</p>
            <p className="text-xs opacity-90">Present</p>
          </Card>
          <Card className="p-4 bg-destructive text-destructive-foreground text-center">
            <p className="text-3xl font-bold">{stats.absent}</p>
            <p className="text-xs opacity-90">Absent</p>
          </Card>
          <Card className="p-4 bg-muted text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Days</p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by date (yyyy-mm-dd)"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Attendance List */}
        <Card className="p-4">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {format(new Date(), "MMMM yyyy")} Records
          </h2>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredAttendance.length > 0 ? (
              filteredAttendance.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(record.status)}
                    <div>
                      <p className="font-medium">
                        {format(parseISO(record.attendance_date), "EEEE, MMM d")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getStatusLabel(record.status)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {record.entry_time && (
                      <p>In: {format(new Date(record.entry_time), "h:mm a")}</p>
                    )}
                    {record.exit_time && (
                      <p>Out: {format(new Date(record.exit_time), "h:mm a")}</p>
                    )}
                    {!record.entry_time && !record.exit_time && (
                      <p className="text-destructive">Not marked</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No attendance records found
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceHistory;
