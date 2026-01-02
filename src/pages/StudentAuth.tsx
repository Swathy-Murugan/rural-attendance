import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, User, Hash, Building, Lock, QrCode, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { studentSignUp, studentSignIn, saveSession, updateStudentQRCode } from "@/lib/auth";
import { studentSignUpSchema, studentSignInSchema } from "@/lib/validation";
import { handleError } from "@/lib/errorHandler";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";

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
    password: "",
  });

  const generateQRCode = async (studentId: string, rollNumber: string, name: string) => {
    // Include timestamp for uniqueness
    const qrData = JSON.stringify({
      id: studentId,
      roll: rollNumber,
      name: name,
      type: "student",
      ts: Date.now()
    });
    return await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = studentSignUpSchema.safeParse(signUpData);
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      // Generate a temporary QR code
      const tempId = crypto.randomUUID();
      const tempQrCode = await generateQRCode(tempId, signUpData.rollNumber, signUpData.name);

      const result = await studentSignUp({
        name: signUpData.name.trim(),
        studentClass: signUpData.studentClass.trim(),
        section: signUpData.section.trim().toUpperCase(),
        roll_number: signUpData.rollNumber.trim(),
        school_name: signUpData.schoolName.trim(),
        password: signUpData.password,
        qr_code: tempQrCode,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success && result.user) {
        // Update QR code with actual student ID
        const finalQrCode = await generateQRCode(
          result.user.id, 
          signUpData.rollNumber, 
          signUpData.name
        );
        
        await updateStudentQRCode(result.user.id, finalQrCode);

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
      }
    } catch (error) {
      handleError(error, "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = studentSignInSchema.safeParse(signInData);
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setIsLoading(true);

    try {
      const result = await studentSignIn({
        roll_number: signInData.rollNumber.trim(),
        password: signInData.password,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success && result.user && result.sessionToken) {
        // Store session securely
        saveSession(result.sessionToken, 'student');
        
        // Store non-sensitive user info for display purposes
        localStorage.setItem("studentLoggedIn", "true");
        localStorage.setItem("studentId", result.user.id);
        localStorage.setItem("studentName", result.user.name);
        localStorage.setItem("studentClass", result.user.class as string);
        localStorage.setItem("studentSection", result.user.section as string);
        localStorage.setItem("studentRollNumber", result.user.roll_number as string);
        localStorage.setItem("studentSchool", result.user.school_name as string);

        toast.success(`Welcome, ${result.user.name}!`);
        navigate("/student-dashboard");
      }
    } catch (error) {
      handleError(error, "Sign in failed. Please try again.");
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
                  maxLength={20}
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
                  maxLength={100}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center pt-2">
                <ForgotPasswordDialog userType="student" />
              </div>
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
                  maxLength={100}
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
                    maxLength={10}
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
                  maxLength={20}
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
                  maxLength={200}
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
                    placeholder="Min. 6 chars"
                    className="h-11"
                    required
                    maxLength={100}
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
                    maxLength={100}
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
