import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, LogIn, LogOut as LogOutIcon, XCircle, User, Wifi, WifiOff, CloudUpload, CheckCircle, Clock, History, Trash2, Edit2 } from "lucide-react";
import { useSupabaseAttendance, AttendanceStatus } from "@/hooks/useSupabaseAttendance";
import { useSync } from "@/hooks/useSync";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { EditAttendanceDialog } from "@/components/EditAttendanceDialog";
import { getSessionToken, verifySession, clearSession } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Students = () => {
  const navigate = useNavigate();
  const { 
    students, 
    loading, 
    updating,
    markAttendance, 
    editAttendance,
    getStudentStatus, 
    hasMarkedType,
    removeStudent 
  } = useSupabaseAttendance();
  const { isOnline, isSyncing, unsyncedCount } = useSync();
  const [activeTab, setActiveTab] = useState<"entry" | "exit">("entry");
  
  // Edit attendance dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<{
    id: string;
    name: string;
    currentStatus: AttendanceStatus;
    newStatus: "present" | "absent";
  } | null>(null);

  const teacherClass = localStorage.getItem("teacherClass") || "";

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

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "complete": return "bg-success text-success-foreground";
      case "entry-only": return "bg-primary text-primary-foreground";
      case "exit-only": return "bg-secondary text-secondary-foreground";
      case "absent": return "bg-destructive text-destructive-foreground";
      default: return "bg-warning text-warning-foreground";
    }
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case "complete": return "✓ Verified";
      case "entry-only": return "Entry Only";
      case "exit-only": return "Exit Only";
      case "absent": return "Absent";
      default: return "⚠ Unmarked";
    }
  };

  // Open edit dialog with proper new status
  const openEditDialog = (studentId: string, studentName: string, currentStatus: AttendanceStatus) => {
    // Determine what the new status should be (toggle)
    const newStatus: "present" | "absent" = currentStatus === "absent" ? "present" : "absent";
    
    setEditingStudent({
      id: studentId,
      name: studentName,
      currentStatus,
      newStatus
    });
    setEditDialogOpen(true);
  };

  // Handle confirmed edit
  const handleEditConfirm = async () => {
    if (!editingStudent) return;
    
    const success = await editAttendance(editingStudent.id, editingStudent.newStatus);
    if (success) {
      setEditDialogOpen(false);
      setEditingStudent(null);
    }
  };

  const studentsWithStatus = students.map(student => ({
    ...student,
    status: getStudentStatus(student.id),
    hasEntry: hasMarkedType(student.id, "entry"),
    hasExit: hasMarkedType(student.id, "exit")
  }));

  // Separate students by status for grouped display
  const unmarkedStudents = studentsWithStatus.filter(s => s.status === "unmarked");
  const absentStudents = studentsWithStatus.filter(s => s.status === "absent");
  const markedStudents = studentsWithStatus.filter(s => 
    s.status === "complete" || s.status === "entry-only" || s.status === "exit-only"
  );

  const completeCount = studentsWithStatus.filter(s => s.status === "complete").length;
  const entryOnlyCount = studentsWithStatus.filter(s => s.status === "entry-only").length;
  const absentCount = absentStudents.length;
  const unmarkedCount = unmarkedStudents.length;

  // Check if a student's attendance can be edited (has a record for today)
  const canEditAttendance = (status: AttendanceStatus) => {
    return status !== "unmarked";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
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
              <p className="text-sm opacity-90">
                {teacherClass ? `Class ${teacherClass}` : "All Students"} - Double Verification
              </p>
            </div>
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
                  <span className="text-sm font-medium text-success">Online - Synced</span>
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

        {students.length === 0 && !loading && (
          <Card className="p-8 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold mb-2">No Students Added</h3>
            <p className="text-muted-foreground mb-4">
              Add students from the Dashboard to start taking attendance.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </Card>
        )}

        {students.length > 0 && (
          <>
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
                  <>
                    {/* Not Marked Section */}
                    {unmarkedStudents.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-2">
                          <Clock className="w-5 h-5 text-warning" />
                          <h3 className="font-bold text-lg text-warning">Not Marked ({unmarkedStudents.length})</h3>
                        </div>
                        {unmarkedStudents.map((student) => (
                          <Card key={student.id} className="p-4 border-l-4 border-l-warning">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-full bg-warning text-warning-foreground">
                                <Clock className="w-6 h-6" />
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{student.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Roll No: {student.roll_number} • {student.class}-{student.section}
                                </p>
                                <span className="text-xs px-2 py-1 rounded-full mt-1 inline-block bg-warning text-warning-foreground">
                                  ⚠ Unmarked
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="lg"
                                  className="bg-success hover:bg-success/90 text-success-foreground h-14 w-14"
                                  onClick={() => markAttendance(student.id, "present", "entry")}
                                >
                                  <LogIn className="w-6 h-6" />
                                </Button>
                                <Button
                                  size="lg"
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-14 w-14"
                                  onClick={() => markAttendance(student.id, "absent", "entry")}
                                >
                                  <XCircle className="w-6 h-6" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-14 w-10"
                                  onClick={() => navigate(`/attendance-history?studentId=${student.id}`)}
                                  title="View History"
                                >
                                  <History className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Absent Section */}
                    {absentStudents.length > 0 && (
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center gap-2 px-2">
                          <XCircle className="w-5 h-5 text-destructive" />
                          <h3 className="font-bold text-lg text-destructive">Absent ({absentStudents.length})</h3>
                        </div>
                        {absentStudents.map((student) => (
                          <Card key={student.id} className="p-4 border-l-4 border-l-destructive">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-full bg-destructive text-destructive-foreground">
                                <User className="w-6 h-6" />
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{student.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Roll No: {student.roll_number} • {student.class}-{student.section}
                                </p>
                                <span className="text-xs px-2 py-1 rounded-full mt-1 inline-block bg-destructive text-destructive-foreground">
                                  Absent
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="lg"
                                  variant="outline"
                                  className="h-14 w-14 border-amber-400 text-amber-600 hover:bg-amber-50"
                                  onClick={() => openEditDialog(student.id, student.name, student.status)}
                                  title="Change to Present"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-14 w-10"
                                  onClick={() => navigate(`/attendance-history?studentId=${student.id}`)}
                                  title="View History"
                                >
                                  <History className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Present/Entry Marked Section */}
                    {markedStudents.length > 0 && (
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center gap-2 px-2">
                          <CheckCircle className="w-5 h-5 text-success" />
                          <h3 className="font-bold text-lg text-success">Marked ({markedStudents.length})</h3>
                        </div>
                        {markedStudents.map((student) => (
                          <Card key={student.id} className="p-4 border-l-4 border-l-success">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-full ${getStatusColor(student.status)}`}>
                                <User className="w-6 h-6" />
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{student.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Roll No: {student.roll_number} • {student.class}-{student.section}
                                </p>
                                <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${getStatusColor(student.status)}`}>
                                  {getStatusLabel(student.status)}
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="lg"
                                  className="bg-success hover:bg-success/90 text-success-foreground h-14 w-14"
                                  disabled
                                >
                                  <CheckCircle className="w-6 h-6" />
                                </Button>
                                <Button
                                  size="lg"
                                  variant="outline"
                                  className="h-14 w-14 border-amber-400 text-amber-600 hover:bg-amber-50"
                                  onClick={() => openEditDialog(student.id, student.name, student.status)}
                                  title="Change to Absent"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-14 w-10"
                                  onClick={() => navigate(`/attendance-history?studentId=${student.id}`)}
                                  title="View History"
                                >
                                  <History className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
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
                  <>
                    {/* Entry Required Section (Unmarked) */}
                    {unmarkedStudents.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-2">
                          <Clock className="w-5 h-5 text-warning" />
                          <h3 className="font-bold text-lg text-warning">Not Marked ({unmarkedStudents.length})</h3>
                        </div>
                        {unmarkedStudents.map((student) => (
                          <Card key={student.id} className="p-4 border-l-4 border-l-warning opacity-60">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-full bg-warning text-warning-foreground">
                                <Clock className="w-6 h-6" />
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{student.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Roll No: {student.roll_number} • {student.class}-{student.section}
                                </p>
                                <span className="text-xs px-2 py-1 rounded-full mt-1 inline-block bg-warning text-warning-foreground">
                                  ⚠ Entry Required First
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="lg"
                                  className="bg-muted text-muted-foreground h-14 w-14"
                                  disabled
                                  title="Entry must be marked first"
                                >
                                  <LogOutIcon className="w-6 h-6" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Absent Section */}
                    {absentStudents.length > 0 && (
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center gap-2 px-2">
                          <XCircle className="w-5 h-5 text-destructive" />
                          <h3 className="font-bold text-lg text-destructive">Absent ({absentStudents.length})</h3>
                        </div>
                        {absentStudents.map((student) => (
                          <Card key={student.id} className="p-4 border-l-4 border-l-destructive">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-full bg-destructive text-destructive-foreground">
                                <User className="w-6 h-6" />
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{student.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Roll No: {student.roll_number} • {student.class}-{student.section}
                                </p>
                                <span className="text-xs px-2 py-1 rounded-full mt-1 inline-block bg-destructive text-destructive-foreground">
                                  Absent
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="lg"
                                  variant="outline"
                                  className="h-14 w-14 border-amber-400 text-amber-600 hover:bg-amber-50"
                                  onClick={() => openEditDialog(student.id, student.name, student.status)}
                                  title="Change to Present"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Entry Marked - Awaiting Exit */}
                    {markedStudents.filter(s => s.status === "entry-only").length > 0 && (
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center gap-2 px-2">
                          <LogOutIcon className="w-5 h-5 text-primary" />
                          <h3 className="font-bold text-lg text-primary">Awaiting Exit ({markedStudents.filter(s => s.status === "entry-only").length})</h3>
                        </div>
                        {markedStudents.filter(s => s.status === "entry-only").map((student) => (
                          <Card key={student.id} className="p-4 border-l-4 border-l-primary">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-full bg-primary text-primary-foreground">
                                <User className="w-6 h-6" />
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{student.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Roll No: {student.roll_number} • {student.class}-{student.section}
                                </p>
                                <span className="text-xs px-2 py-1 rounded-full mt-1 inline-block bg-primary text-primary-foreground">
                                  Entry Only
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="lg"
                                  className="bg-success hover:bg-success/90 text-success-foreground h-14 w-14"
                                  onClick={() => markAttendance(student.id, "present", "exit")}
                                >
                                  <LogOutIcon className="w-6 h-6" />
                                </Button>
                                <Button
                                  size="lg"
                                  variant="outline"
                                  className="h-14 w-14 border-amber-400 text-amber-600 hover:bg-amber-50"
                                  onClick={() => openEditDialog(student.id, student.name, student.status)}
                                  title="Change to Absent"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-14 w-10 text-destructive hover:text-destructive"
                                      title="Remove Student"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Student?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove {student.name} from your class list. 
                                        The student account will remain active.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => removeStudent(student.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Completed Section */}
                    {markedStudents.filter(s => s.status === "complete").length > 0 && (
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center gap-2 px-2">
                          <CheckCircle className="w-5 h-5 text-success" />
                          <h3 className="font-bold text-lg text-success">Verified ({markedStudents.filter(s => s.status === "complete").length})</h3>
                        </div>
                        {markedStudents.filter(s => s.status === "complete").map((student) => (
                          <Card key={student.id} className="p-4 border-l-4 border-l-success">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-full bg-success text-success-foreground">
                                <CheckCircle className="w-6 h-6" />
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{student.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Roll No: {student.roll_number} • {student.class}-{student.section}
                                </p>
                                <span className="text-xs px-2 py-1 rounded-full mt-1 inline-block bg-success text-success-foreground">
                                  ✓ Verified
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="lg"
                                  className="bg-success text-success-foreground h-14 w-14"
                                  disabled
                                >
                                  <CheckCircle className="w-6 h-6" />
                                </Button>
                                <Button
                                  size="lg"
                                  variant="outline"
                                  className="h-14 w-14 border-amber-400 text-amber-600 hover:bg-amber-50"
                                  onClick={() => openEditDialog(student.id, student.name, student.status)}
                                  title="Change to Absent"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-14 w-10 text-destructive hover:text-destructive"
                                      title="Remove Student"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Student?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove {student.name} from your class list. 
                                        The student account will remain active.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => removeStudent(student.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Info Card */}
            <Card className="p-4 bg-accent/50 text-accent-foreground">
              <h3 className="font-bold mb-2">Double Verification System</h3>
              <ul className="text-sm space-y-1">
                <li>• <span className="text-warning font-medium">Unmarked</span> - Attendance not yet recorded</li>
                <li>• <span className="text-primary font-medium">Entry Only</span> - Student has entered, awaiting exit</li>
                <li>• <span className="text-success font-medium">Verified</span> - Both entry and exit recorded</li>
                <li>• <span className="text-destructive font-medium">Absent</span> - Student marked absent</li>
                <li>• <Edit2 className="w-4 h-4 inline text-amber-600" /> <span className="text-amber-600 font-medium">Edit</span> - Change attendance status (today only)</li>
              </ul>
            </Card>
          </>
        )}
      </div>

      {/* Edit Attendance Confirmation Dialog */}
      <EditAttendanceDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        studentName={editingStudent?.name || ""}
        currentStatus={editingStudent?.currentStatus || "unmarked"}
        newStatus={editingStudent?.newStatus || "present"}
        onConfirm={handleEditConfirm}
        isLoading={updating}
      />
    </div>
  );
};

export default Students;
