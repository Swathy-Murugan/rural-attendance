import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, Clock, QrCode, FileText, LogOut } from "lucide-react";
import { toast } from "sonner";

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  notMarked: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AttendanceStats>({
    total: 45,
    present: 38,
    absent: 4,
    notMarked: 3
  });

  useEffect(() => {
    // Check if teacher is logged in
    const isLoggedIn = localStorage.getItem("teacherLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("teacherLoggedIn");
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
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm opacity-90">
              {new Date().toLocaleDateString("en-IN", { 
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
            label="Present Today" 
            value={stats.present} 
            color="bg-success text-success-foreground"
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
