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
import { Key, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChangePasswordDialogProps {
  studentId: string;
  studentName: string;
}

export const ChangePasswordDialog = ({ studentId, studentName }: ChangePasswordDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentPassword.trim() || !formData.newPassword.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.newPassword.length < 4) {
      toast.error("New password must be at least 4 characters");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsLoading(true);
    
    try {
      // Verify current password first
      const { data: student, error: verifyError } = await supabase
        .from("students")
        .select("password")
        .eq("id", studentId)
        .single();

      if (verifyError) throw verifyError;

      if (student.password !== formData.currentPassword) {
        toast.error("Current password is incorrect");
        setIsLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase
        .from("students")
        .update({ password: formData.newPassword })
        .eq("id", studentId);

      if (updateError) throw updateError;

      toast.success("Password changed successfully!");
      setOpen(false);
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Password change error:", error);
      toast.error("Failed to change password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Key className="w-4 h-4" />
          Change Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Change your password for {studentName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Password *</label>
            <Input
              type="password"
              placeholder="Enter current password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Password *</label>
            <Input
              type="password"
              placeholder="Enter new password (min 4 characters)"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="h-11"
              minLength={4}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password *</label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="h-11"
              minLength={4}
              required
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Your password should be at least 4 characters long.
          </p>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Changing...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
