import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandler";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
  const teacherId = localStorage.getItem("teacherId");
  const teacherClass = localStorage.getItem("teacherClass");

  // Load students assigned to this teacher using edge function
  const loadStudents = useCallback(async () => {
    if (!teacherId) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-students",
          teacher_id: teacherId
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      setStudents(result.students || []);
    } catch (error) {
      handleError(error, "Failed to load students");
    }
  }, [teacherId]);

  // Load today's attendance using edge function
  const loadTodayAttendance = useCallback(async () => {
    if (!teacherId) return;
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-attendance",
          teacher_id: teacherId,
          date: today
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      setTodayAttendance(result.attendance || []);
    } catch (error) {
      handleError(error, "Failed to load attendance");
    }
  }, [today, teacherId]);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStudents(), loadTodayAttendance()]);
    setLoading(false);
  }, [loadStudents, loadTodayAttendance]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mark attendance (entry or exit) using edge function
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
      const now = new Date().toISOString();

      if (existingRecord) {
        // Check if already marked
        if (type === "entry" && existingRecord.entry_time) {
          toast.info(`${student.name}'s entry already marked`);
          return;
        }
        if (type === "exit" && existingRecord.exit_time) {
          toast.info(`${student.name}'s exit already marked`);
          return;
        }

        // Prepare update data
        let newStatus = existingRecord.status;
        let entryTime = existingRecord.entry_time;
        let exitTime = existingRecord.exit_time;

        if (type === "entry") {
          entryTime = now;
          newStatus = status === "absent" ? "absent" : "entry-only";
        } else {
          exitTime = now;
          newStatus = existingRecord.entry_time ? "complete" : "exit-only";
        }

        // Update via edge function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark-attendance",
            student_id: studentId,
            attendance_date: today,
            status: newStatus,
            entry_time: entryTime,
            exit_time: exitTime,
            marked_by: teacherId
          })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);
      } else {
        // Create new record
        const newStatus = status === "absent" ? "absent" : (type === "entry" ? "entry-only" : "exit-only");
        const entryTime = type === "entry" && status === "present" ? now : null;
        const exitTime = type === "exit" ? now : null;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark-attendance",
            student_id: studentId,
            attendance_date: today,
            status: newStatus,
            entry_time: entryTime,
            exit_time: exitTime,
            marked_by: teacherId
          })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        // Update student counts for new records
        const newPresentDays = status === "present" ? (student.present_days || 0) + 1 : (student.present_days || 0);
        const newAbsentDays = status === "absent" ? (student.absent_days || 0) + 1 : (student.absent_days || 0);
        const newTotalDays = (student.total_days || 0) + 1;

        await fetch(`${SUPABASE_URL}/functions/v1/manage-students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-student-stats",
            student_id: studentId,
            present_days: newPresentDays,
            absent_days: newAbsentDays,
            total_days: newTotalDays
          })
        });
      }

      await loadTodayAttendance();
      await loadStudents();
      const typeLabel = type === "entry" ? "Entry" : "Exit";
      toast.success(`${student.name} - ${typeLabel} marked as ${status}`);
    } catch (error) {
      handleError(error, "Failed to mark attendance");
    }
  }, [students, todayAttendance, today, teacherId, loadTodayAttendance, loadStudents]);

  // Edit attendance for current day only - change absent to present or vice versa
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

      const now = new Date().toISOString();

      // Prepare attendance update
      let updatedStatus = "";
      let entryTime: string | null = null;
      let exitTime: string | null = null;

      if (newStatus === "present") {
        updatedStatus = "entry-only";
        entryTime = now;
        exitTime = null;
      } else {
        updatedStatus = "absent";
        entryTime = null;
        exitTime = null;
      }

      // Update via edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark-attendance",
          student_id: studentId,
          attendance_date: today,
          status: updatedStatus,
          entry_time: entryTime,
          exit_time: exitTime,
          marked_by: teacherId
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Update student counts
      let newPresentDays = student.present_days || 0;
      let newAbsentDays = student.absent_days || 0;

      if (isCurrentlyAbsent && newStatus === "present") {
        newPresentDays = newPresentDays + 1;
        newAbsentDays = Math.max(0, newAbsentDays - 1);
      } else if (isCurrentlyPresent && newStatus === "absent") {
        newPresentDays = Math.max(0, newPresentDays - 1);
        newAbsentDays = newAbsentDays + 1;
      }

      await fetch(`${SUPABASE_URL}/functions/v1/manage-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-student-stats",
          student_id: studentId,
          present_days: newPresentDays,
          absent_days: newAbsentDays
        })
      });

      await Promise.all([loadTodayAttendance(), loadStudents()]);
      
      toast.success(`${student.name}'s attendance changed to ${newStatus}`);
      return true;
    } catch (error) {
      handleError(error, "Failed to update attendance");
      return false;
    } finally {
      setUpdating(false);
    }
  }, [students, todayAttendance, today, teacherId, loadTodayAttendance, loadStudents]);



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

  // Add student to teacher's class using edge function
  const addStudent = useCallback(async (studentData: {
    name: string;
    roll_number: string;
    class: string;
    section: string;
    school_name: string;
  }): Promise<boolean> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-student",
          ...studentData,
          teacher_id: teacherId
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      toast.success(`${studentData.name} added successfully`);
      await loadStudents();
      return true;
    } catch (error) {
      handleError(error, "Failed to add student");
      return false;
    }
  }, [teacherId, loadStudents]);

  // Remove student from teacher's list using edge function
  const removeStudent = useCallback(async (studentId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove-student",
          student_id: studentId,
          teacher_id: teacherId
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      toast.success("Student removed from your list");
      await loadStudents();
      return true;
    } catch (error) {
      handleError(error, "Failed to remove student");
      return false;
    }
  }, [teacherId, loadStudents]);

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
