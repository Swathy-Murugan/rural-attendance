import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { School, Lock, User, Hash, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { teacherSignUp, teacherSignIn, saveSession } from "@/lib/auth";
import { teacherSignUpSchema, teacherSignInSchema } from "@/lib/validation";
import { handleError } from "@/lib/errorHandler";

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Sign In state
  const [signInTeacherId, setSignInTeacherId] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  
  // Sign Up state
  const [signUpName, setSignUpName] = useState("");
  const [signUpTeacherId, setSignUpTeacherId] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [signUpAssignedClass, setSignUpAssignedClass] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = teacherSignInSchema.safeParse({
      teacherId: signInTeacherId,
      password: signInPassword,
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await teacherSignIn({
        teacher_id: signInTeacherId.toUpperCase(),
        password: signInPassword,
      });

      if (result.error) {
        toast.error(result.error);
        setSignInPassword("");
        return;
      }
      
      if (result.success && result.user && result.sessionToken) {
        // Store session securely
        saveSession(result.sessionToken, 'teacher');
        
        // Store non-sensitive user info for display purposes
        localStorage.setItem("teacherLoggedIn", "true");
        localStorage.setItem("teacherId", result.user.id);
        localStorage.setItem("teacherName", result.user.name);
        localStorage.setItem("teacherClass", (result.user.assigned_class as string) || "");
        
        toast.success(`Welcome, ${result.user.name}!`);
        navigate("/dashboard");
      }
    } catch (error) {
      handleError(error, "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = teacherSignUpSchema.safeParse({
      name: signUpName,
      teacherId: signUpTeacherId,
      password: signUpPassword,
      confirmPassword: signUpConfirmPassword,
      assignedClass: signUpAssignedClass || undefined,
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const result = await teacherSignUp({
        name: signUpName.trim(),
        teacher_id: signUpTeacherId.toUpperCase(),
        password: signUpPassword,
        assigned_class: signUpAssignedClass.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success && result.user && result.sessionToken) {
        // Store session securely
        saveSession(result.sessionToken, 'teacher');
        
        localStorage.setItem("teacherLoggedIn", "true");
        localStorage.setItem("teacherId", result.user.id);
        localStorage.setItem("teacherName", result.user.name);
        localStorage.setItem("teacherClass", (result.user.assigned_class as string) || "");
        
        toast.success("Registration successful! Welcome!");
        navigate("/dashboard");
      }
    } catch (error) {
      handleError(error, "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <School className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Teacher Portal</h1>
          <p className="text-muted-foreground">Rural Attendance System</p>
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
                  Teacher ID
                </label>
                <Input
                  type="text"
                  value={signInTeacherId}
                  onChange={(e) => setSignInTeacherId(e.target.value.toUpperCase())}
                  placeholder="Enter your Teacher ID"
                  className="h-12 text-lg"
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
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="Enter your Password"
                  className="h-12 text-lg"
                  required
                  maxLength={100}
                />
              </div>

              <Button
                type="submit" 
                className="w-full h-12 text-lg font-semibold"
                disabled={!signInTeacherId || !signInPassword || isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
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
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-11"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Teacher ID
                </label>
                <Input
                  type="text"
                  value={signUpTeacherId}
                  onChange={(e) => setSignUpTeacherId(e.target.value.toUpperCase())}
                  placeholder="Create a Teacher ID (e.g., T001)"
                  className="h-11"
                  required
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <School className="w-4 h-4" />
                  Assigned Class (Optional)
                </label>
                <Input
                  type="text"
                  value={signUpAssignedClass}
                  onChange={(e) => setSignUpAssignedClass(e.target.value)}
                  placeholder="e.g., 10-A"
                  className="h-11"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password (min. 6 characters)
                </label>
                <Input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="Create a password"
                  className="h-11"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                <Input
                  type="password"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
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
                {isLoading ? "Creating Account..." : "Sign Up"}
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

export default Login;
