import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const registerSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email({ message: 'Must be a valid email address' }),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, { message: 'Password must be at least 8 characters long' })
      .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
      .regex(/[0-9]/, { message: 'Password must contain at least one digit' }),
    role: z.nativeEnum(UserRole, {
      required_error: 'Role is required (PATIENT, DOCTOR, or TESTING_LAB)',
    }),
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters long' }),
    mrn: z.string().trim().optional(),
    licenseNumber: z.string().trim().optional(),
    organization: z.string().trim().optional(),
    specialty: z.string().trim().optional(),
    gender: z.string().trim().optional(),
    bloodType: z.string().trim().optional(),
    allergies: z.array(z.string()).optional(),
    dateOfBirth: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => !val || val.trim() === '' || !isNaN(Date.parse(val)),
        { message: 'Invalid date format for date of birth' }
      ),
    phone: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === UserRole.DOCTOR && (!data.licenseNumber || data.licenseNumber.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Medical license number is mandatory for Doctor registration',
        path: ['licenseNumber'],
      });
    }
    if (data.role === UserRole.TESTING_LAB && (!data.organization || data.organization.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Laboratory or Facility organization name is mandatory for Testing Lab registration',
        path: ['organization'],
      });
    }
  });

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email or Medical Record Number (MRN) is required' })
    .trim()
    .min(1, { message: 'Email or MRN is required' }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, { message: 'Password cannot be empty' }),
  expectedRole: z.nativeEnum(UserRole).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
