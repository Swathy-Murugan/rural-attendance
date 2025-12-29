import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, User, Hash, Building, Lock, QrCode, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";

const StudentAuth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Sign Up state
  const [signUpData, setSignUpData] = useState({
    name: "",
    studentClass: "",
    section: "",
    rollNumber: "",
    schoolName: "",
    password: "",
    confirmPassword: "",
  });

  // Sign In state
  const [signInData, setSignInData] = useState({
    rollNumber: "",
    schoolName: "",
    password: "",
  });

  const generateQRCode = async (studentId: string, rollNumber: string, name: string) => {
    const qrData = JSON.stringify({
      id: studentId,
      roll: rollNumber,
      name: name,
      type: "student"
    });
    return await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (signUpData.password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Generate a temporary ID for QR code
      const tempId = crypto.randomUUID();
      const qrCode = await generateQRCode(tempId, signUpData.rollNumber, signUpData.name);

      const { data, error } = await supabase
        .from("students")
        .insert({
          name: signUpData.name.trim(),
          class: signUpData.studentClass.trim(),
          section: signUpData.section.trim().toUpperCase(),
          roll_number: signUpData.rollNumber.trim(),
          school_name: signUpData.schoolName.trim(),
          password: signUpData.password,
          qr_code: qrCode,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("A student with this roll number already exists at this school");
        } else {
          toast.error("Registration failed. Please try again.");
        }
        return;
      }

      // Update QR code with actual ID
      const finalQrCode = await generateQRCode(data.id, data.roll_number, data.name);
      await supabase
        .from("students")
        .update({ qr_code: finalQrCode })
        .eq("id", data.id);

      toast.success("Registration successful! You can now sign in.");
      setSignUpData({
        name: "",
        studentClass: "",
        section: "",
        rollNumber: "",
        schoolName: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("roll_number", signInData.rollNumber.trim())
        .eq("school_name", signInData.schoolName.trim())
        .eq("password", signInData.password)
        .maybeSingle();

      if (error || !data) {
        toast.error("Invalid credentials. Please check your details.");
        return;
      }

      // Store student session in localStorage
      localStorage.setItem("studentLoggedIn", "true");
      localStorage.setItem("studentId", data.id);
      localStorage.setItem("studentName", data.name);
      localStorage.setItem("studentClass", data.class);
      localStorage.setItem("studentSection", data.section);
      localStorage.setItem("studentRollNumber", data.roll_number);
      localStorage.setItem("studentSchool", data.school_name);

      toast.success(`Welcome, ${data.name}!`);
      navigate("/student-dashboard");
    } catch (error) {
      toast.error("Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-secondary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Student Portal</h1>
          <p className="text-muted-foreground">Sign up or sign in to view your attendance</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 mt-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Roll Number
                </label>
                <Input
                  type="text"
                  value={signInData.rollNumber}
                  onChange={(e) => setSignInData({ ...signInData, rollNumber: e.target.value })}
                  placeholder="Enter your roll number"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  School Name
                </label>
                <Input
                  type="text"
                  value={signInData.schoolName}
                  onChange={(e) => setSignInData({ ...signInData, schoolName: e.target.value })}
                  placeholder="Enter your school name"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <Input
                  type="password"
                  value={signInData.password}
                  onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="h-11"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                <Input
                  type="text"
                  value={signUpData.name}
                  onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="h-11"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Class</label>
                  <Input
                    type="text"
                    value={signUpData.studentClass}
                    onChange={(e) => setSignUpData({ ...signUpData, studentClass: e.target.value })}
                    placeholder="e.g., 5"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Section</label>
                  <Input
                    type="text"
                    value={signUpData.section}
                    onChange={(e) => setSignUpData({ ...signUpData, section: e.target.value.toUpperCase() })}
                    placeholder="e.g., A"
                    maxLength={2}
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Roll Number
                </label>
                <Input
                  type="text"
                  value={signUpData.rollNumber}
                  onChange={(e) => setSignUpData({ ...signUpData, rollNumber: e.target.value })}
                  placeholder="Enter your roll number"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  School Name
                </label>
                <Input
                  type="text"
                  value={signUpData.schoolName}
                  onChange={(e) => setSignUpData({ ...signUpData, schoolName: e.target.value })}
                  placeholder="Enter your school name"
                  className="h-11"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </label>
                  <Input
                    type="password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    placeholder="Password"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Confirm</label>
                  <Input
                    type="password"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                    placeholder="Confirm"
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground flex items-start gap-2">
                <QrCode className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p>A unique QR code will be generated for you after registration. This will be used for attendance scanning.</p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Registering..." : "Sign Up & Get QR Code"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StudentAuth;