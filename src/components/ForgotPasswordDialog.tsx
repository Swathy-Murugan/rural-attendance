import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

interface ForgotPasswordDialogProps {
  userType: "teacher" | "student";
}

const SUPABASE_URL = "https://xwjaeyeakfquwwdkwfat.supabase.co";

export const ForgotPasswordDialog = ({ userType }: ForgotPasswordDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"request" | "reset">("request");
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error(`Please enter your ${userType === "teacher" ? "Teacher ID" : "Roll Number"}`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_type: userType,
          identifier: identifier.trim()
        })
      });

      const result = await response.json();

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Reset token generated! Check with your administrator.");
        // For demo purposes, show the token (in production, this would be sent via email/SMS)
        if (result.reset_token) {
          setResetToken(result.reset_token);
        }
        setStep("reset");
      }
    } catch {
      toast.error("Failed to request password reset");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_type: userType,
          identifier: identifier.trim(),
          reset_token: resetToken,
          new_password: newPassword
        })
      });

      const result = await response.json();

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Password reset successfully! You can now sign in.");
        handleClose();
      }
    } catch {
      toast.error("Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep("request");
    setIdentifier("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="link" className="text-muted-foreground p-0 h-auto">
          Forgot Password?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            {step === "request" 
              ? `Enter your ${userType === "teacher" ? "Teacher ID" : "Roll Number"} to reset your password.`
              : "Enter the reset token and your new password."
            }
          </DialogDescription>
        </DialogHeader>

        {step === "request" ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <Input
              type="text"
              placeholder={userType === "teacher" ? "Teacher ID (e.g., T001)" : "Roll Number"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="h-11"
              maxLength={20}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                "Request Reset Token"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reset Token</label>
              <Input
                type="text"
                placeholder="Enter reset token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="h-11"
              />
              {resetToken && (
                <p className="text-xs text-muted-foreground">
                  Token auto-filled for demo. In production, this would be sent via SMS/email.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11"
                maxLength={100}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep("request")}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
