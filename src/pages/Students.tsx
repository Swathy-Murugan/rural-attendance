import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, User, Wifi, WifiOff, CloudUpload } from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import { useSync } from "@/hooks/useSync";

const Students = () => {
  const navigate = useNavigate();
  const { students, loading, markAttendance: mark, getStudentStatus } = useAttendance();
  const { isOnline, isSyncing, unsyncedCount } = useSync();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("teacherLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-success text-success-foreground";
      case "absent": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const studentsWithStatus = students.map(student => ({
    ...student,
    status: getStudentStatus(student.id)
  }));

  const presentCount = studentsWithStatus.filter(s => s.status === "present").length;
  const absentCount = studentsWithStatus.filter(s => s.status === "absent").length;
  const unmarkedCount = studentsWithStatus.filter(s => s.status === "unmarked").length;

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
            <h1 className="text-2xl font-bold">Student List</h1>
            <p className="text-sm opacity-90">Class 5A - Manual Attendance</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Online Status & Summary */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5 text-success" />
                  <span className="text-sm font-medium text-success">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-warning" />
                  <span className="text-sm font-medium text-warning">Offline Mode</span>
                </>
              )}
            </div>
            {unsyncedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CloudUpload className="w-4 h-4" />
                {isSyncing ? "Syncing..." : `${unsyncedCount} pending`}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-around text-center pt-2 border-t">
            <div>
              <p className="text-2xl font-bold text-success">{presentCount}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{absentCount}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{unmarkedCount}</p>
              <p className="text-sm text-muted-foreground">Unmarked</p>
            </div>
          </div>
        </Card>

        {/* Student Cards */}
        {loading ? (
          <Card className="p-4 text-center text-muted-foreground">
            Loading students...
          </Card>
        ) : (
          studentsWithStatus.map((student) => (
          <Card key={student.id} className="p-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${getStatusColor(student.status)}`}>
                <User className="w-6 h-6" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-lg">{student.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Roll No: {student.rollNo} • {student.class}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="lg"
                  className="bg-success hover:bg-success/90 text-success-foreground h-14 w-14"
                  onClick={() => mark(student.id, "present")}
                  disabled={student.status === "present"}
                >
                  <CheckCircle className="w-6 h-6" />
                </Button>
                <Button
                  size="lg"
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-14 w-14"
                  onClick={() => mark(student.id, "absent")}
                  disabled={student.status === "absent"}
                >
                  <XCircle className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Students;
