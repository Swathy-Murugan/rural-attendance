import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, Clock, QrCode, FileText, LogOut, Wifi, WifiOff, CloudUpload, ArrowRightCircle } from "lucide-react";
import { toast } from "sonner";
import { useAttendance } from "@/hooks/useAttendance";
import { useSync } from "@/hooks/useSync";
import { clearSession, getSessionToken, verifySession } from "@/lib/auth";
interface AttendanceStats {
  total: number;
  complete: number;
  entryOnly: number;
  absent: number;
  notMarked: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { getTodayStats, todayAttendance } = useAttendance();
  const { isOnline, isSyncing, unsyncedCount } = useSync();
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    complete: 0,
    entryOnly: 0,
    absent: 0,
    notMarked: 0
  });

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
  }, [getTodayStats, todayAttendance]);

  const teacherName = localStorage.getItem("teacherName") || "Teacher";
  const teacherClass = localStorage.getItem("teacherClass") || "";

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
          <StatCard 
            icon={XCircle} 
            label="Absent Today" 
            value={stats.absent} 
            color="bg-destructive text-destructive-foreground"
          />
          <StatCard 
            icon={Clock} 
            label="Not Marked" 
            value={stats.notMarked} 
            color="bg-warning text-warning-foreground"
          />
        </div>

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

        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-medium">Rahul Kumar - Class 5A</span>
              </div>
              <span className="text-sm text-muted-foreground">9:15 AM</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-medium">Priya Sharma - Class 5A</span>
              </div>
              <span className="text-sm text-muted-foreground">9:14 AM</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-medium">Amit Singh - Class 5A</span>
              </div>
              <span className="text-sm text-muted-foreground">9:12 AM</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
