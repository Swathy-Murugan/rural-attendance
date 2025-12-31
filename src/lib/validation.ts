import { z } from 'zod';

// Student registration schema
export const studentSignUpSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s.]+$/, 'Name can only contain letters, spaces, and periods'),
  studentClass: z.string()
    .min(1, 'Class is required')
    .max(10, 'Class must be less than 10 characters'),
  section: z.string()
    .min(1, 'Section is required')
    .max(2, 'Section must be 1-2 characters')
    .regex(/^[A-Za-z]+$/, 'Section must be letters only'),
  rollNumber: z.string()
    .min(1, 'Roll number is required')
    .max(20, 'Roll number must be less than 20 characters'),
  schoolName: z.string()
    .min(3, 'School name must be at least 3 characters')
    .max(200, 'School name must be less than 200 characters'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Student sign in schema
export const studentSignInSchema = z.object({
  rollNumber: z.string()
    .min(1, 'Roll number is required')
    .max(20, 'Roll number must be less than 20 characters'),
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password must be less than 100 characters'),
});

// Teacher registration schema
export const teacherSignUpSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s.]+$/, 'Name can only contain letters, spaces, and periods'),
  teacherId: z.string()
    .min(1, 'Teacher ID is required')
    .max(20, 'Teacher ID must be less than 20 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Teacher ID can only contain letters and numbers'),
  assignedClass: z.string()
    .max(10, 'Class must be less than 10 characters')
    .optional(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Teacher sign in schema
export const teacherSignInSchema = z.object({
  teacherId: z.string()
    .min(1, 'Teacher ID is required')
    .max(20, 'Teacher ID must be less than 20 characters'),
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password must be less than 100 characters'),
});

// Type exports
export type StudentSignUpData = z.infer<typeof studentSignUpSchema>;
export type StudentSignInData = z.infer<typeof studentSignInSchema>;
export type TeacherSignUpData = z.infer<typeof teacherSignUpSchema>;
export type TeacherSignInData = z.infer<typeof teacherSignInSchema>;
