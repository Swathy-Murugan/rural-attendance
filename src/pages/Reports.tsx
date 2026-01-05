import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Calendar, TrendingUp, AlertTriangle, Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { getSessionToken, verifySession, clearSession } from "@/lib/auth";
import { 
  downloadDailyReport, 
  downloadWeeklyReport, 
  downloadMonthlyReport, 
  downloadMidDayMealReport,
  getAttendanceStats
} from "@/lib/reportUtils";
import { handleError } from "@/lib/errorHandler";

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({
    averageAttendance: 0,
    workingDays: 0,
    lowAttendanceStudents: [] as Array<{
      name: string;
      rollNumber: string;
      percentage: number;
      present: number;
      total: number;
    }>
  });
  const [statsLoading, setStatsLoading] = useState(true);

  

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
        return;
      }
      loadStats();
    };
    checkAuth();
  }, [navigate]);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const data = await getAttendanceStats();
      setStats(data);
    } catch (error) {
      handleError(error, "Failed to load statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  const handleDownload = async (type: "daily" | "weekly" | "monthly" | "midday") => {
    setLoading(type);
    try {
      let count = 0;
      switch (type) {
        case "daily":
          count = await downloadDailyReport();
          break;
        case "weekly":
          count = await downloadWeeklyReport();
          break;
        case "monthly":
          count = await downloadMonthlyReport();
          break;
        case "midday":
          count = await downloadMidDayMealReport();
          break;
      }
      toast.success(`Report downloaded with ${count} records`);
    } catch (error) {
      handleError(error, "Failed to download report");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button 
            variant="secondary" 
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="h-12 w-12"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-sm opacity-90">Download & View Statistics</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-success text-success-foreground">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8" />
              <div>
                {statsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <p className="text-2xl font-bold">{stats.averageAttendance}%</p>
                )}
                <p className="text-sm opacity-90">Average Attendance</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-accent text-accent-foreground">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              <div>
                {statsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <p className="text-2xl font-bold">{stats.workingDays}</p>
                )}
                <p className="text-sm opacity-90">Working Days</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Download Reports */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Download Reports</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">Daily Report</p>
                <p className="text-sm text-muted-foreground">Today's attendance summary</p>
              </div>
              <Button 
                onClick={() => handleDownload("daily")} 
                className="h-12"
                disabled={loading === "daily"}
              >
                {loading === "daily" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    CSV
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">Weekly Report</p>
                <p className="text-sm text-muted-foreground">Last 7 days overview</p>
              </div>
              <Button 
                onClick={() => handleDownload("weekly")} 
                className="h-12"
                disabled={loading === "weekly"}
              >
                {loading === "weekly" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    CSV
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">Monthly Report</p>
                <p className="text-sm text-muted-foreground">Full month statistics</p>
              </div>
              <Button 
                onClick={() => handleDownload("monthly")} 
                className="h-12"
                disabled={loading === "monthly"}
              >
                {loading === "monthly" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    CSV
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">Mid-Day Meal Report</p>
                <p className="text-sm text-muted-foreground">Government scheme data (last 30 days)</p>
              </div>
              <Button 
                onClick={() => handleDownload("midday")} 
                variant="secondary"
                className="h-12"
                disabled={loading === "midday"}
              >
                {loading === "midday" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Low Attendance Alert */}
        {stats.lowAttendanceStudents.length > 0 && (
          <Card className="p-6 bg-warning/10 border-warning">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Low Attendance Alert (&lt;75%)
            </h3>
            <div className="space-y-2">
              {stats.lowAttendanceStudents.slice(0, 5).map((student, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-background rounded-lg"
                >
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">Roll: {student.rollNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">{student.percentage}%</p>
                    <p className="text-xs text-muted-foreground">
                      {student.present}/{student.total} days
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {stats.lowAttendanceStudents.length > 5 && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                +{stats.lowAttendanceStudents.length - 5} more students with low attendance
              </p>
            )}
          </Card>
        )}

        {/* View History Link */}
        <Card className="p-4">
          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={() => navigate("/students")}
          >
            <History className="w-5 h-5 mr-2" />
            View Student Attendance Details
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
