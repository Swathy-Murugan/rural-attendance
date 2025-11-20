import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, User } from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  class: string;
  status: "present" | "absent" | "unmarked";
}

const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([
    { id: "1", name: "Rahul Kumar", rollNo: "501", class: "5A", status: "present" },
    { id: "2", name: "Priya Sharma", rollNo: "502", class: "5A", status: "present" },
    { id: "3", name: "Amit Singh", rollNo: "503", class: "5A", status: "unmarked" },
    { id: "4", name: "Neha Patel", rollNo: "504", class: "5A", status: "absent" },
    { id: "5", name: "Vikram Rao", rollNo: "505", class: "5A", status: "unmarked" },
    { id: "6", name: "Anjali Verma", rollNo: "506", class: "5A", status: "present" },
    { id: "7", name: "Rohit Mehta", rollNo: "507", class: "5A", status: "unmarked" },
    { id: "8", name: "Kavya Reddy", rollNo: "508", class: "5A", status: "present" },
  ]);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("teacherLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const markAttendance = (id: string, status: "present" | "absent") => {
    setStudents(students.map(s => 
      s.id === id ? { ...s, status } : s
    ));
    const student = students.find(s => s.id === id);
    toast.success(`${student?.name} marked as ${status}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-success text-success-foreground";
      case "absent": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
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
            <h1 className="text-2xl font-bold">Student List</h1>
            <p className="text-sm opacity-90">Class 5A - Manual Attendance</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-success">{students.filter(s => s.status === "present").length}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{students.filter(s => s.status === "absent").length}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{students.filter(s => s.status === "unmarked").length}</p>
              <p className="text-sm text-muted-foreground">Unmarked</p>
            </div>
          </div>
        </Card>

        {/* Student Cards */}
        {students.map((student) => (
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
                  onClick={() => markAttendance(student.id, "present")}
                  disabled={student.status === "present"}
                >
                  <CheckCircle className="w-6 h-6" />
                </Button>
                <Button
                  size="lg"
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-14 w-14"
                  onClick={() => markAttendance(student.id, "absent")}
                  disabled={student.status === "absent"}
                >
                  <XCircle className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Students;
