import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandler";
import * as api from "@/lib/api";

export type AttendanceStatus = "unmarked" | "entry-only" | "exit-only" | "complete" | "absent";

export interface Student {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  section: string;
  school_name: string;
  teacher_id?: string;
  present_days?: number;
  absent_days?: number;
  total_days?: number;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string;
  entry_time: string | null;
  exit_time: string | null;
  status: string;
  marked_by: string | null;
  synced: boolean;
}

export const useSupabaseAttendance = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // Load students assigned to this teacher via secure API
  const loadStudents = useCallback(async () => {
    try {
      const result = await api.getStudents();
      if (result.error) {
        throw new Error(result.error);
      }
      setStudents(result.data || []);
    } catch (error) {
      handleError(error, "Failed to load students");
    }
  }, []);

  // Load today's attendance via secure API
  const loadTodayAttendance = useCallback(async () => {
    try {
      const result = await api.getAttendance(today);
      if (result.error) {
        throw new Error(result.error);
      }
      setTodayAttendance(result.data || []);
    } catch (error) {
      handleError(error, "Failed to load attendance");
    }
  }, [today]);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStudents(), loadTodayAttendance()]);
    setLoading(false);
  }, [loadStudents, loadTodayAttendance]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mark attendance (entry or exit) via secure API
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

      const existingRecord = todayAttendance.find(a => a.student_id === studentId);

      if (existingRecord) {
        if (type === "entry" && existingRecord.entry_time) {
          toast.info(`${student.name}'s entry already marked`);
          return;
        }
        if (type === "exit" && existingRecord.exit_time) {
          toast.info(`${student.name}'s exit already marked`);
          return;
        }
      }

      const result = await api.markAttendance(studentId, status, type);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      await loadTodayAttendance();
      await loadStudents();
      toast.success(result.message || `${student.name} - ${type} marked as ${status}`);
    } catch (error) {
      handleError(error, "Failed to mark attendance");
    }
  }, [students, todayAttendance, loadTodayAttendance, loadStudents]);

  // Edit attendance for current day only via secure API
  const editAttendance = useCallback(async (
    studentId: string,
    newStatus: "present" | "absent"
  ): Promise<boolean> => {
    try {
      setUpdating(true);
      const student = students.find(s => s.id === studentId);
      if (!student) {
        toast.error("Student not found");
        return false;
      }

      const existingRecord = todayAttendance.find(a => a.student_id === studentId);
      if (!existingRecord) {
        toast.error("No attendance record found for today");
        return false;
      }

      const currentStatus = existingRecord.status;
      const isCurrentlyAbsent = currentStatus === "absent";
      const isCurrentlyPresent = currentStatus === "entry-only" || currentStatus === "complete" || currentStatus === "exit-only";

      // Prevent no-op changes
      if ((newStatus === "absent" && isCurrentlyAbsent) || 
          (newStatus === "present" && isCurrentlyPresent)) {
        toast.info(`Student is already marked as ${newStatus}`);
        return false;
      }

      const result = await api.editAttendance(studentId, newStatus);
      
      if (result.error) {
        toast.error(result.error);
        return false;
      }

      await Promise.all([loadTodayAttendance(), loadStudents()]);
      
      toast.success(result.message || `${student.name}'s attendance changed to ${newStatus}`);
      return true;
    } catch (error) {
      handleError(error, "Failed to update attendance");
      return false;
    } finally {
      setUpdating(false);
    }
  }, [students, todayAttendance, loadTodayAttendance, loadStudents]);

  // Get student attendance status
  const getStudentStatus = useCallback((studentId: string): AttendanceStatus => {
    const record = todayAttendance.find(a => a.student_id === studentId);
    if (!record) return "unmarked";

    if (record.status === "absent") return "absent";
    if (record.status === "complete") return "complete";
    if (record.entry_time && record.exit_time) return "complete";
    if (record.entry_time) return "entry-only";
    if (record.exit_time) return "exit-only";
    return "unmarked";
  }, [todayAttendance]);

  // Check if specific type is marked
  const hasMarkedType = useCallback((studentId: string, type: "entry" | "exit"): boolean => {
    const record = todayAttendance.find(a => a.student_id === studentId);
    if (!record) return false;
    return type === "entry" ? !!record.entry_time : !!record.exit_time;
  }, [todayAttendance]);

  // Get today's stats
  const getTodayStats = useCallback(async () => {
    const total = students.length;
    let complete = 0;
    let entryOnly = 0;
    let absent = 0;

    for (const student of students) {
      const status = getStudentStatus(student.id);
      if (status === "complete") complete++;
      else if (status === "entry-only") entryOnly++;
      else if (status === "absent") absent++;
    }

    const notMarked = total - complete - entryOnly - absent;
    return { total, complete, entryOnly, absent, notMarked };
  }, [students, getStudentStatus]);

  // Add student to teacher's class via secure API
  const addStudent = useCallback(async (studentData: {
    name: string;
    roll_number: string;
    class: string;
    section: string;
    school_name: string;
  }): Promise<boolean> => {
    try {
      const result = await api.addStudent(studentData);
      
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      
      toast.success(result.message || `${studentData.name} added successfully`);
      await loadStudents();
      return true;
    } catch (error) {
      handleError(error, "Failed to add student");
      return false;
    }
  }, [loadStudents]);

  // Remove student from teacher's list via secure API
  const removeStudent = useCallback(async (studentId: string): Promise<boolean> => {
    try {
      const result = await api.removeStudent(studentId);
      
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      
      toast.success(result.message || "Student removed from your list");
      await loadStudents();
      return true;
    } catch (error) {
      handleError(error, "Failed to remove student");
      return false;
    }
  }, [loadStudents]);

  return {
    students,
    todayAttendance,
    loading,
    updating,
    markAttendance,
    editAttendance,
    getStudentStatus,
    hasMarkedType,
    getTodayStats,
    addStudent,
    removeStudent,
    refreshData: loadData
  };
};
