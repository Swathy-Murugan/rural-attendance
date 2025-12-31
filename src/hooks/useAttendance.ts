import { useState, useEffect, useCallback } from "react";
import { db, AttendanceRecord, Student, AttendanceStatus } from "@/lib/db";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandler";

export const useAttendance = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  // Initialize demo students on first load
  const initializeDemoData = useCallback(async () => {
    const existingStudents = await db.getStudents();
    
    if (existingStudents.length === 0) {
      const demoStudents: Student[] = [
        { id: "1", name: "Rahul Kumar", rollNo: "501", class: "5A" },
        { id: "2", name: "Priya Sharma", rollNo: "502", class: "5A" },
        { id: "3", name: "Amit Singh", rollNo: "503", class: "5A" },
        { id: "4", name: "Neha Patel", rollNo: "504", class: "5A" },
        { id: "5", name: "Vikram Rao", rollNo: "505", class: "5A" },
        { id: "6", name: "Anjali Verma", rollNo: "506", class: "5A" },
        { id: "7", name: "Rohit Mehta", rollNo: "507", class: "5A" },
        { id: "8", name: "Kavya Reddy", rollNo: "508", class: "5A" },
      ];
      
      await db.saveStudents(demoStudents);
      setStudents(demoStudents);
    } else {
      setStudents(existingStudents);
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await db.init();
      await initializeDemoData();
      
      const studentsData = await db.getStudents();
      const attendanceData = await db.getAttendanceByDate(today);
      
      setStudents(studentsData);
      setTodayAttendance(attendanceData);
    } catch (error) {
      handleError(error, "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [today, initializeDemoData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mark attendance with entry/exit type
  const markAttendance = useCallback(async (
    studentId: string,
    status: "present" | "absent",
    type: "entry" | "exit" = "entry"
  ): Promise<void> => {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) {
        toast.error("Student not found");
        return;
      }

      // Check if already marked for this type today
      const existingRecord = todayAttendance.find(
        a => a.studentId === studentId && a.type === type
      );
      if (existingRecord) {
        toast.info(`${student.name}'s ${type} already marked`);
        return;
      }

      const record: Omit<AttendanceRecord, "id"> = {
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        class: student.class,
        status,
        type,
        timestamp: Date.now(),
        date: today,
        synced: false
      };

      await db.addAttendance(record);
      await loadData(); // Refresh data
      
      const typeLabel = type === "entry" ? "Entry" : "Exit";
      toast.success(`${student.name} - ${typeLabel} marked as ${status}`);
    } catch (error) {
      handleError(error, "Failed to mark attendance");
    }
  }, [students, todayAttendance, today, loadData]);

  // Get student status for today (with double verification)
  const getStudentStatus = useCallback((studentId: string): AttendanceStatus => {
    const studentRecords = todayAttendance.filter(a => a.studentId === studentId);
    
    const hasEntry = studentRecords.some(r => r.type === "entry" && r.status === "present");
    const hasExit = studentRecords.some(r => r.type === "exit" && r.status === "present");
    const isAbsent = studentRecords.some(r => r.status === "absent");
    
    if (isAbsent) return "absent";
    if (hasEntry && hasExit) return "complete";
    if (hasEntry) return "entry-only";
    if (hasExit) return "exit-only";
    return "unmarked";
  }, [todayAttendance]);

  // Check if specific type is marked
  const hasMarkedType = useCallback((studentId: string, type: "entry" | "exit"): boolean => {
    return todayAttendance.some(a => a.studentId === studentId && a.type === type);
  }, [todayAttendance]);

  // Get today's stats
  const getTodayStats = useCallback(async () => {
    return await db.getTodayStats(today);
  }, [today]);

  return {
    students,
    todayAttendance,
    loading,
    markAttendance,
    getStudentStatus,
    hasMarkedType,
    getTodayStats,
    refreshData: loadData
  };
};
