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
import { UserPlus, Loader2 } from "lucide-react";

interface AddStudentDialogProps {
  onAddStudent: (data: {
    name: string;
    roll_number: string;
    class: string;
    section: string;
    school_name: string;
  }) => Promise<boolean>;
  defaultClass?: string;
  defaultSection?: string;
}

export const AddStudentDialog = ({ 
  onAddStudent, 
  defaultClass = "", 
  defaultSection = "" 
}: AddStudentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    roll_number: "",
    class: defaultClass,
    section: defaultSection,
    school_name: localStorage.getItem("schoolName") || ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.roll_number.trim() || !formData.class.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsLoading(true);
    const success = await onAddStudent({
      name: formData.name.trim(),
      roll_number: formData.roll_number.trim(),
      class: formData.class.trim(),
      section: formData.section.trim() || "A",
      school_name: formData.school_name.trim() || "Rural School"
    });

    setIsLoading(false);
    if (success) {
      setOpen(false);
      setFormData({
        name: "",
        roll_number: "",
        class: defaultClass,
        section: defaultSection,
        school_name: formData.school_name
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Student
          </DialogTitle>
          <DialogDescription>
            Add a student to your class. They can sign in with their roll number.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Student Name *</label>
            <Input
              type="text"
              placeholder="Full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-11"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Roll Number *</label>
            <Input
              type="text"
              placeholder="e.g., 501"
              value={formData.roll_number}
              onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
              className="h-11"
              maxLength={20}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class *</label>
              <Input
                type="text"
                placeholder="e.g., 5"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                className="h-11"
                maxLength={10}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Input
                type="text"
                placeholder="e.g., A"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                className="h-11"
                maxLength={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">School Name</label>
            <Input
              type="text"
              placeholder="School name"
              value={formData.school_name}
              onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
              className="h-11"
              maxLength={200}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Default password will be "123456". Students can change it after signing in.
          </p>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Student"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
