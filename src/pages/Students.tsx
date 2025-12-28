import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, LogIn, LogOut as LogOutIcon, XCircle, User, Wifi, WifiOff, CloudUpload, CheckCircle } from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import { useSync } from "@/hooks/useSync";
import { AttendanceStatus } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Students = () => {
  const navigate = useNavigate();
  const { students, loading, markAttendance, getStudentStatus, hasMarkedType } = useAttendance();
  const { isOnline, isSyncing, unsyncedCount } = useSync();
  const [activeTab, setActiveTab] = useState<"entry" | "exit">("entry");

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("teacherLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "complete": return "bg-success text-success-foreground";
      case "entry-only": return "bg-primary text-primary-foreground";
      case "exit-only": return "bg-secondary text-secondary-foreground";
      case "absent": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case "complete": return "✓ Verified";
      case "entry-only": return "Entry Only";
      case "exit-only": return "Exit Only";
      case "absent": return "Absent";
      default: return "Unmarked";
    }
  };

  const studentsWithStatus = students.map(student => ({
    ...student,
    status: getStudentStatus(student.id),
    hasEntry: hasMarkedType(student.id, "entry"),
    hasExit: hasMarkedType(student.id, "exit")
  }));

  const completeCount = studentsWithStatus.filter(s => s.status === "complete").length;
  const entryOnlyCount = studentsWithStatus.filter(s => s.status === "entry-only").length;
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
            <p className="text-sm opacity-90">Class 5A - Double Verification</p>
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
              <p className="text-2xl font-bold text-success">{completeCount}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{entryOnlyCount}</p>
              <p className="text-xs text-muted-foreground">Entry Only</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{absentCount}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{unmarkedCount}</p>
              <p className="text-xs text-muted-foreground">Unmarked</p>
            </div>
          </div>
        </Card>

        {/* Entry/Exit Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "entry" | "exit")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14">
            <TabsTrigger value="entry" className="text-lg gap-2">
              <LogIn className="w-5 h-5" />
              Entry
            </TabsTrigger>
            <TabsTrigger value="exit" className="text-lg gap-2">
              <LogOutIcon className="w-5 h-5" />
              Exit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entry" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Mark student entry when they arrive at school
            </p>
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
                      <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${getStatusColor(student.status)}`}>
                        {getStatusLabel(student.status)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        className="bg-success hover:bg-success/90 text-success-foreground h-14 w-14"
                        onClick={() => markAttendance(student.id, "present", "entry")}
                        disabled={student.hasEntry || student.status === "absent"}
                      >
                        {student.hasEntry ? <CheckCircle className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
                      </Button>
                      <Button
                        size="lg"
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-14 w-14"
                        onClick={() => markAttendance(student.id, "absent", "entry")}
                        disabled={student.hasEntry || student.status === "absent"}
                      >
                        <XCircle className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="exit" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Mark student exit when they leave school
            </p>
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
                      <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${getStatusColor(student.status)}`}>
                        {getStatusLabel(student.status)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        className="bg-success hover:bg-success/90 text-success-foreground h-14 w-14"
                        onClick={() => markAttendance(student.id, "present", "exit")}
                        disabled={student.hasExit || student.status === "absent" || !student.hasEntry}
                        title={!student.hasEntry ? "Entry must be marked first" : ""}
                      >
                        {student.hasExit ? <CheckCircle className="w-6 h-6" /> : <LogOutIcon className="w-6 h-6" />}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="p-4 bg-accent/50 text-accent-foreground">
          <h3 className="font-bold mb-2">Double Verification</h3>
          <ul className="text-sm space-y-1">
            <li>• Students must scan at both entry and exit</li>
            <li>• Attendance is only valid when both are recorded</li>
            <li>• Exit can only be marked after entry</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Students;