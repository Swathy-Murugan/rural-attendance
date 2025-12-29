import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { School, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";

const Login = () => {
  const [teacherId, setTeacherId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize demo teachers on first load
    db.initDemoTeachers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const teacher = await db.authenticateTeacher(teacherId, password);
      
      if (teacher) {
        localStorage.setItem("teacherLoggedIn", "true");
        localStorage.setItem("teacherId", teacher.id);
        localStorage.setItem("teacherName", teacher.name);
        localStorage.setItem("teacherClass", teacher.assignedClass);
        toast.success(`Welcome, ${teacher.name}!`);
        navigate("/dashboard");
      } else {
        toast.error("Invalid Teacher ID or Password");
        setPassword("");
      }
    } catch (error) {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <School className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Rural Attendance</h1>
          <p className="text-muted-foreground text-lg">Teacher Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Teacher ID
            </label>
            <Input
              type="text"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value.toUpperCase())}
              placeholder="Enter Teacher ID (e.g., T001)"
              className="h-12 text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 4-digit Password"
              className="h-12 text-lg text-center tracking-widest"
            />
          </div>

          <Button
            type="submit" 
            className="w-full h-14 text-lg font-semibold"
            disabled={!teacherId || password.length !== 4 || isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="text-muted-foreground"
          >
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
