import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, 
  QrCode, 
  Calendar, 
  User, 
  LogOut, 
  CheckCircle, 
  Clock, 
  XCircle,
  Award,
  Wifi,
  WifiOff,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { clearSession, getSessionToken, verifySession } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";

interface StudentProfile {
  id: string;
  name: string;
  class: string;
  section: string;
  roll_number: string;
  school_name: string;
  qr_code: string;
  scholarship_eligible: boolean;
}

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  entry_time: string | null;
  exit_time: string | null;
  status: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);
  const [monthStats, setMonthStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = getSessionToken();
      if (!token) {
        navigate("/student-auth");
        return;
      }
      const result = await verifySession(token);
      if (!result.valid || result.userType !== 'student') {
        clearSession();
        navigate("/student-auth");
        return;
      }
      fetchStudentData();
    };
    checkAuth();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [navigate]);

  const fetchStudentData = async () => {
    const studentId = localStorage.getItem("studentId");
    if (!studentId) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch attendance history for current month
      const startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const endDate = format(endOfMonth(new Date()), "yyyy-MM-dd");

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("student_id", studentId)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date", { ascending: false });

      if (attendanceError) throw attendanceError;
      setAttendanceHistory(attendanceData || []);

      // Find today's attendance
      const today = format(new Date(), "yyyy-MM-dd");
      const todayRecord = attendanceData?.find(r => r.attendance_date === today);
      setTodayAttendance(todayRecord || null);

      // Calculate month stats
      const daysInMonth = eachDayOfInterval({
        start: startOfMonth(new Date()),
        end: new Date()
      }).filter(d => d.getDay() !== 0); // Exclude Sundays

      const presentDays = attendanceData?.filter(r => r.status === "complete").length || 0;
      const totalDays = daysInMonth.length;

      setMonthStats({
        total: totalDays,
        present: presentDays,
        absent: totalDays - presentDays,
        percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
      });
    } catch (error) {
      handleError(error, "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const downloadQRCode = () => {
    if (!profile?.qr_code) return;
    
    const link = document.createElement("a");
    link.download = `${profile.name}-QR-Code.png`;
    link.href = profile.qr_code;
    link.click();
    toast.success("QR Code downloaded!");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "entry-only":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "complete":
        return "Present (Entry & Exit)";
      case "entry-only":
        return "Entry Only";
      default:
        return "Absent";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-secondary text-secondary-foreground p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            <div>
              <h1 className="font-bold text-lg">Student Portal</h1>
              <p className="text-sm opacity-80">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${isOnline ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200"}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? "Online" : "Offline"}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Today's Status Card */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today's Attendance - {format(new Date(), "EEEE, MMMM d")}
          </h2>
          
          {todayAttendance ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                {getStatusIcon(todayAttendance.status)}
                <div>
                  <p className="font-medium">{getStatusLabel(todayAttendance.status)}</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {todayAttendance.entry_time && (
                      <p>Entry: {format(new Date(todayAttendance.entry_time), "h:mm a")}</p>
                    )}
                    {todayAttendance.exit_time && (
                      <p>Exit: {format(new Date(todayAttendance.exit_time), "h:mm a")}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <XCircle className="w-5 h-5 text-muted-foreground" />
              <p className="text-muted-foreground">No attendance marked yet today</p>
            </div>
          )}
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="qrcode" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="qrcode">QR Code</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="schemes">Schemes</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* QR Code Tab */}
          <TabsContent value="qrcode">
            <Card className="p-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-bold flex items-center justify-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Your Attendance QR Code
                </h3>
                <p className="text-sm text-muted-foreground">
                  Show this QR code to your teacher for attendance scanning
                </p>
                
                {profile?.qr_code && (
                  <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
                    <img 
                      src={profile.qr_code} 
                      alt="Student QR Code" 
                      className="w-64 h-64 mx-auto"
                    />
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">{profile?.name}</p>
                  <p>Roll No: {profile?.roll_number} | Class: {profile?.class}-{profile?.section}</p>
                </div>

                <Button onClick={downloadQRCode} className="mt-4">
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Monthly Attendance</h3>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{monthStats.percentage}%</p>
                    <p className="text-sm text-muted-foreground">
                      {monthStats.present}/{monthStats.total} days
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{monthStats.present}</p>
                    <p className="text-sm text-muted-foreground">Present</p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{monthStats.absent}</p>
                    <p className="text-sm text-muted-foreground">Absent</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{monthStats.total}</p>
                    <p className="text-sm text-muted-foreground">Total Days</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attendanceHistory.length > 0 ? (
                    attendanceHistory.map((record) => (
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
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No attendance records found for this month
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Schemes Tab */}
          <TabsContent value="schemes">
            <Card className="p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Award className="w-5 h-5" />
                Scholarship & Government Schemes
              </h3>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${profile?.scholarship_eligible ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-muted bg-muted"}`}>
                  <div className="flex items-center gap-3">
                    {profile?.scholarship_eligible ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-bold">Mid-Day Meal Scheme</p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.scholarship_eligible 
                          ? "You are eligible for this scheme" 
                          : "Requires 75% attendance. Current: " + monthStats.percentage + "%"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border-2 ${monthStats.percentage >= 80 ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-muted bg-muted"}`}>
                  <div className="flex items-center gap-3">
                    {monthStats.percentage >= 80 ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <Clock className="w-6 h-6 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-bold">Scholarship Eligibility</p>
                      <p className="text-sm text-muted-foreground">
                        {monthStats.percentage >= 80 
                          ? "Eligible - 80%+ attendance achieved" 
                          : `Need ${80 - monthStats.percentage}% more attendance for eligibility`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Eligibility is calculated based on verified attendance 
                    (both entry and exit scans required). Maintain good attendance to qualify for 
                    government schemes and scholarships.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <User className="w-5 h-5" />
                Profile Details
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{profile?.name}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Roll Number</p>
                    <p className="font-medium">{profile?.roll_number}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Class</p>
                    <p className="font-medium">{profile?.class}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Section</p>
                    <p className="font-medium">{profile?.section}</p>
                  </div>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">School Name</p>
                  <p className="font-medium">{profile?.school_name}</p>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="destructive" onClick={handleLogout} className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;