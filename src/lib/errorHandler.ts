import { toast } from "sonner";

/**
 * Handles errors securely by:
 * - Logging detailed errors only in development
 * - Showing generic user-friendly messages in production
 */
export function handleError(error: unknown, userMessage: string): void {
  // Only log detailed errors in development
  if (import.meta.env.DEV) {
    console.error('Error details:', error);
  }
  
  // Always show a generic, safe message to users
  toast.error(userMessage);
}

/**
 * Safely extracts an error message from an unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred';
}
