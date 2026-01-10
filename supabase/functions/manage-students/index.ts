import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...data } = await req.json();

    if (action === "add-student") {
      const { name, roll_number, class: studentClass, section, school_name, teacher_id } = data;

      // Validate required fields
      if (!name?.trim() || !roll_number?.trim() || !studentClass?.trim() || !teacher_id?.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if student with same roll number exists in same class
      const { data: existingStudent, error: checkError } = await supabase
        .from("students")
        .select("id")
        .eq("roll_number", roll_number.trim())
        .eq("class", studentClass.trim())
        .eq("section", section?.trim() || "A")
        .single();

      if (existingStudent) {
        return new Response(
          JSON.stringify({ success: false, error: "A student with this roll number already exists in this class" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a unique QR code
      const qrCode = `STU-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Insert the student
      const { data: newStudent, error: insertError } = await supabase
        .from("students")
        .insert({
          name: name.trim(),
          roll_number: roll_number.trim(),
          class: studentClass.trim(),
          section: section?.trim() || "A",
          school_name: school_name?.trim() || "Rural School",
          teacher_id: teacher_id,
          password: "123456", // Default password
          qr_code: qrCode,
          present_days: 0,
          absent_days: 0,
          total_days: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, student: newStudent }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "remove-student") {
      const { student_id, teacher_id } = data;

      if (!student_id || !teacher_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing student_id or teacher_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove student from teacher's list (set teacher_id to null)
      const { error: updateError } = await supabase
        .from("students")
        .update({ teacher_id: null })
        .eq("id", student_id)
        .eq("teacher_id", teacher_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-students") {
      const { teacher_id } = data;

      if (!teacher_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing teacher_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: students, error: fetchError } = await supabase
        .from("students")
        .select("id, name, roll_number, class, section, school_name, teacher_id, present_days, absent_days, total_days")
        .eq("teacher_id", teacher_id)
        .order("roll_number");

      if (fetchError) {
        return new Response(
          JSON.stringify({ success: false, error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, students: students || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get today's attendance for a teacher's students
    if (action === "get-attendance") {
      const { teacher_id, date } = data;

      if (!teacher_id || !date) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing teacher_id or date" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get students for this teacher
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id")
        .eq("teacher_id", teacher_id);

      if (studentsError) {
        return new Response(
          JSON.stringify({ success: false, error: studentsError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const studentIds = (students || []).map(s => s.id);

      if (studentIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, attendance: [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get attendance for these students on the date
      const { data: attendance, error: attendanceError } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("attendance_date", date)
        .in("student_id", studentIds);

      if (attendanceError) {
        return new Response(
          JSON.stringify({ success: false, error: attendanceError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, attendance: attendance || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark attendance (create or update)
    if (action === "mark-attendance") {
      const { student_id, attendance_date, status, entry_time, exit_time, marked_by } = data;

      if (!student_id || !attendance_date || !status) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if record exists
      const { data: existing } = await supabase
        .from("student_attendance")
        .select("id")
        .eq("student_id", student_id)
        .eq("attendance_date", attendance_date)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const updateData: Record<string, unknown> = { status, marked_by, synced: true };
        if (entry_time !== undefined) updateData.entry_time = entry_time;
        if (exit_time !== undefined) updateData.exit_time = exit_time;

        const { error: updateError } = await supabase
          .from("student_attendance")
          .update(updateData)
          .eq("id", existing.id);

        if (updateError) {
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("student_attendance")
          .insert({
            student_id,
            attendance_date,
            status,
            entry_time: entry_time || null,
            exit_time: exit_time || null,
            marked_by,
            synced: true
          });

        if (insertError) {
          return new Response(
            JSON.stringify({ success: false, error: insertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update student stats (present_days, absent_days, etc.)
    if (action === "update-student-stats") {
      const { student_id, present_days, absent_days, total_days } = data;

      if (!student_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing student_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, number> = {};
      if (present_days !== undefined) updateData.present_days = present_days;
      if (absent_days !== undefined) updateData.absent_days = absent_days;
      if (total_days !== undefined) updateData.total_days = total_days;

      const { error: updateError } = await supabase
        .from("students")
        .update(updateData)
        .eq("id", student_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
