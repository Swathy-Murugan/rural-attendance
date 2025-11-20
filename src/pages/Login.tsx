import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { School, Lock } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const [pin, setPin] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple PIN validation (demo: 1234)
    if (pin === "1234") {
      localStorage.setItem("teacherLoggedIn", "true");
      toast.success("Welcome, Teacher!");
      navigate("/dashboard");
    } else {
      toast.error("Invalid PIN. Try 1234 for demo.");
      setPin("");
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

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Enter PIN
            </label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 4-digit PIN"
              className="h-14 text-2xl text-center tracking-widest"
            />
            <p className="text-xs text-muted-foreground text-center">
              Demo PIN: 1234
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg font-semibold"
            disabled={pin.length !== 4}
          >
            Login
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
