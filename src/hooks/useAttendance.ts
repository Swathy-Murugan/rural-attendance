import { useState, useEffect, useCallback } from "react";
import { db, AttendanceRecord, Student } from "@/lib/db";
import { toast } from "sonner";

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
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [today, initializeDemoData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mark attendance
  const markAttendance = useCallback(async (
    studentId: string,
    status: "present" | "absent"
  ): Promise<void> => {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) {
        toast.error("Student not found");
        return;
      }

      // Check if already marked today
      const existingRecord = todayAttendance.find(a => a.studentId === studentId);
      if (existingRecord) {
        toast.info(`${student.name} already marked as ${existingRecord.status}`);
        return;
      }

      const record: Omit<AttendanceRecord, "id"> = {
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        class: student.class,
        status,
        timestamp: Date.now(),
        date: today,
        synced: false
      };

      await db.addAttendance(record);
      await loadData(); // Refresh data
      
      toast.success(`${student.name} marked as ${status}`);
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to mark attendance");
    }
  }, [students, todayAttendance, today, loadData]);

  // Get student status for today
  const getStudentStatus = useCallback((studentId: string): "present" | "absent" | "unmarked" => {
    const record = todayAttendance.find(a => a.studentId === studentId);
    return record ? record.status : "unmarked";
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
    getTodayStats,
    refreshData: loadData
  };
};
