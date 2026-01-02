import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandler";

export type AttendanceStatus = "unmarked" | "entry-only" | "exit-only" | "complete" | "absent";

export interface Student {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  section: string;
  school_name: string;
  teacher_id?: string;
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

  const today = new Date().toISOString().split("T")[0];
  const teacherId = localStorage.getItem("teacherId");
  const teacherClass = localStorage.getItem("teacherClass");

  // Load students assigned to this teacher
  const loadStudents = useCallback(async () => {
    if (!teacherId) return;

    try {
      let query = supabase
        .from("students")
        .select("id, name, roll_number, class, section, school_name, teacher_id");

      // If teacher has a class assigned, filter by class OR teacher_id
      if (teacherClass) {
        const [cls, section] = teacherClass.split("-");
        query = query.or(`teacher_id.eq.${teacherId},and(class.eq.${cls},section.eq.${section || "A"})`);
      } else {
        query = query.eq("teacher_id", teacherId);
      }

      const { data, error } = await query.order("roll_number");

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      handleError(error, "Failed to load students");
    }
  }, [teacherId, teacherClass]);

  // Load today's attendance
  const loadTodayAttendance = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("attendance_date", today);

      if (error) throw error;
      setTodayAttendance(data || []);
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

  // Mark attendance (entry or exit)
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
        // Update existing record
        if (type === "entry" && existingRecord.entry_time) {
          toast.info(`${student.name}'s entry already marked`);
          return;
        }
        if (type === "exit" && existingRecord.exit_time) {
          toast.info(`${student.name}'s exit already marked`);
          return;
        }

        const updateData: Record<string, unknown> = {
          marked_by: teacherId,
          synced: true
        };

        if (type === "entry") {
          updateData.entry_time = now;
          updateData.status = status === "absent" ? "absent" : "entry-only";
        } else {
          updateData.exit_time = now;
          updateData.status = existingRecord.entry_time ? "complete" : "exit-only";
        }

        const { error } = await supabase
          .from("student_attendance")
          .update(updateData)
          .eq("id", existingRecord.id);

        if (error) throw error;
      } else {
        // Create new record
        const insertData = {
          student_id: studentId,
          attendance_date: today,
          marked_by: teacherId,
          synced: true,
          status: status === "absent" ? "absent" : (type === "entry" ? "entry-only" : "exit-only"),
          entry_time: type === "entry" && status === "present" ? now : null,
          exit_time: type === "exit" ? now : null
        };

        const { error } = await supabase
          .from("student_attendance")
          .insert(insertData);

        if (error) throw error;
      }

      await loadTodayAttendance();
      const typeLabel = type === "entry" ? "Entry" : "Exit";
      toast.success(`${student.name} - ${typeLabel} marked as ${status}`);
    } catch (error) {
      handleError(error, "Failed to mark attendance");
    }
  }, [students, todayAttendance, today, teacherId, loadTodayAttendance]);

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

  // Add student to teacher's class
  const addStudent = useCallback(async (studentData: {
    name: string;
    roll_number: string;
    class: string;
    section: string;
    school_name: string;
  }): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("students")
        .insert({
          ...studentData,
          teacher_id: teacherId,
          password: "123456", // Default password
          qr_code: "" // Will be generated when student logs in
        });

      if (error) throw error;
      toast.success(`${studentData.name} added successfully`);
      await loadStudents();
      return true;
    } catch (error) {
      handleError(error, "Failed to add student");
      return false;
    }
  }, [teacherId, loadStudents]);

  // Remove student from teacher's list
  const removeStudent = useCallback(async (studentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("students")
        .update({ teacher_id: null })
        .eq("id", studentId);

      if (error) throw error;
      toast.success("Student removed from your list");
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
    markAttendance,
    getStudentStatus,
    hasMarkedType,
    getTodayStats,
    addStudent,
    removeStudent,
    refreshData: loadData
  };
};
