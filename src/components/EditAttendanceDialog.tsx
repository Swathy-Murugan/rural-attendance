import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface EditAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  currentStatus: string;
  newStatus: 'present' | 'absent';
  onConfirm: () => void;
  isLoading?: boolean;
}

export function EditAttendanceDialog({
  open,
  onOpenChange,
  studentName,
  currentStatus,
  newStatus,
  onConfirm,
  isLoading = false,
}: EditAttendanceDialogProps) {
  const getStatusLabel = (status: string) => {
    if (status === 'absent') return 'Absent';
    if (status === 'complete' || status === 'entry-only') return 'Present';
    return 'Unmarked';
  };

  const getStatusClass = (status: string) => {
    if (status === 'absent') return 'text-destructive font-medium';
    if (status === 'present' || status === 'complete' || status === 'entry-only') return 'text-success font-medium';
    return 'text-warning font-medium';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            Change Attendance?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-base">Are you sure you want to change attendance?</p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-semibold text-foreground text-lg">{studentName}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Current:</span>
                  <span className={getStatusClass(currentStatus)}>
                    {getStatusLabel(currentStatus)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">New:</span>
                  <span className={getStatusClass(newStatus)}>
                    {getStatusLabel(newStatus)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This will update the student's attendance counts for today.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isLoading} className="h-12">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }} 
            disabled={isLoading}
            className="h-12 min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Yes, Change'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
