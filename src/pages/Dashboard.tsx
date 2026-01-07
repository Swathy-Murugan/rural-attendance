import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, Clock, QrCode, FileText, LogOut, Wifi, WifiOff, CloudUpload, ArrowRightCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseAttendance } from "@/hooks/useSupabaseAttendance";
import { useSync } from "@/hooks/useSync";
import { clearSession, getSessionToken, verifySession } from "@/lib/auth";
import { AddStudentDialog } from "@/components/AddStudentDialog";

interface AttendanceStats {
  total: number;
  complete: number;
  entryOnly: number;
  absent: number;
  notMarked: number;
}

interface StudentInfo {
  id: string;
  name: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { students, getTodayStats, getStudentStatus, loading, addStudent } = useSupabaseAttendance();
  const teacherClass = localStorage.getItem("teacherClass") || "";
  const [defaultClass, defaultSection] = teacherClass.split("-");
  const { isOnline, isSyncing, unsyncedCount } = useSync();
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    complete: 0,
    entryOnly: 0,
    absent: 0,
    notMarked: 0
  });

  // Compute absent and not marked student names
  const { absentStudents, notMarkedStudents } = useMemo(() => {
    const absent: StudentInfo[] = [];
    const notMarked: StudentInfo[] = [];
    
    for (const student of students) {
      const status = getStudentStatus(student.id);
      if (status === "absent") {
        absent.push({ id: student.id, name: student.name });
      } else if (status === "unmarked") {
        notMarked.push({ id: student.id, name: student.name });
      }
    }
    
    return { absentStudents: absent, notMarkedStudents: notMarked };
  }, [students, getStudentStatus]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getSessionToken();
      if (!token) {
        navigate("/login");
        return;
      }
      const result = await verifySession(token);
      if (!result.valid || result.userType !== 'teacher') {
        clearSession();
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const loadStats = async () => {
      const todayStats = await getTodayStats();
      setStats(todayStats);
    };
    loadStats();
  }, [getTodayStats, students, getStudentStatus]);

  const teacherName = localStorage.getItem("teacherName") || "Teacher";

  const handleLogout = () => {
    clearSession();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    color 
  }: { 
    icon: any; 
    label: string; 
    value: number; 
    color: string;
  }) => (
    <Card className={`p-6 ${color}`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-background/80 rounded-lg">
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <p className="text-sm font-medium opacity-90">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {teacherName}</h1>
            <p className="text-sm opacity-90">
              Class {teacherClass} • {new Date().toLocaleDateString("en-IN", { 
                weekday: "long", 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </p>
          </div>
          <Button 
            variant="secondary" 
            size="icon"
            onClick={handleLogout}
            className="h-12 w-12"
          >
            <LogOut className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Online Status Banner */}
        <Card className={`p-4 ${isOnline ? 'bg-success/10' : 'bg-warning/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5 text-success" />
                  <div>
                    <p className="font-semibold text-success">Connected</p>
                    <p className="text-sm text-muted-foreground">All data synced</p>
                  </div>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-semibold text-warning">Working Offline</p>
                    <p className="text-sm text-muted-foreground">Data will sync automatically</p>
                  </div>
                </>
              )}
            </div>
            {unsyncedCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg">
                <CloudUpload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {isSyncing ? "Syncing..." : `${unsyncedCount} pending`}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard 
            icon={Users} 
            label="Total Students" 
            value={stats.total} 
            color="bg-accent text-accent-foreground"
          />
          <StatCard 
            icon={CheckCircle} 
            label="Verified (Entry + Exit)" 
            value={stats.complete} 
            color="bg-success text-success-foreground"
          />
          <StatCard 
            icon={ArrowRightCircle} 
            label="Entry Only" 
            value={stats.entryOnly} 
            color="bg-primary text-primary-foreground"
          />
        </div>

        {/* Absent Today Section */}
        <Card className="p-6 bg-destructive/10 border-destructive/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-destructive rounded-lg">
              <XCircle className="w-6 h-6 text-destructive-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Absent Today</h3>
              <p className="text-sm text-muted-foreground">{stats.absent} student{stats.absent !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {absentStudents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {absentStudents.map(student => (
                <span key={student.id} className="px-3 py-1 bg-destructive/20 text-destructive rounded-full text-sm font-medium">
                  {student.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No students marked absent today</p>
          )}
        </Card>

        {/* Not Marked Section */}
        <Card className="p-6 bg-warning/10 border-warning/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-warning rounded-lg">
              <Clock className="w-6 h-6 text-warning-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Not Marked</h3>
              <p className="text-sm text-muted-foreground">{stats.notMarked} student{stats.notMarked !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {notMarkedStudents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {notMarkedStudents.map(student => (
                <span key={student.id} className="px-3 py-1 bg-warning/20 text-warning-foreground rounded-full text-sm font-medium">
                  {student.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">All students have been marked</p>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button 
              className="h-20 flex flex-col gap-2 text-lg"
              onClick={() => navigate("/scan")}
            >
              <QrCode className="w-8 h-8" />
              Scan QR Code
            </Button>
            <Button 
              variant="secondary"
              className="h-20 flex flex-col gap-2 text-lg"
              onClick={() => navigate("/students")}
            >
              <Users className="w-8 h-8" />
              Mark Manually
            </Button>
            <AddStudentDialog 
              onAddStudent={addStudent}
              defaultClass={defaultClass}
              defaultSection={defaultSection}
            />
            <Button 
              variant="outline"
              className="h-20 flex flex-col gap-2 text-lg"
              onClick={() => navigate("/reports")}
            >
              <FileText className="w-8 h-8" />
              View Reports
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default Dashboard;
