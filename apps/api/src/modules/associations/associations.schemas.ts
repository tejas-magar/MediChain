import { z } from 'zod';

export const patientLookupSchema = z
  .object({
    mrn: z.string({ required_error: 'Medical Record Number (MRN) is required' }).trim().min(3),
    dateOfBirth: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
  })
  .refine((data) => Boolean(data.dateOfBirth || data.email), {
    message:
      'Patient lookup requires exact MRN along with either confirmed Date of Birth or Email address. Name-only matching is strictly prohibited.',
    path: ['dateOfBirth'],
  });

export const createAssociationSchema = z.object({
  patientId: z.string().uuid({ message: 'Valid patient ID is required' }),
  purpose: z.string().trim().min(3, { message: 'Clinical purpose or scope of care must be specified' }).optional(),
});

export const requestAccessSchema = z.object({
  patientId: z.string().uuid({ message: 'Valid patient ID is required' }),
  purpose: z.string().trim().min(3, { message: 'Clinical purpose or scope of care must be specified' }).optional(),
});

export const respondAccessSchema = z.object({
  scope: z.enum(['CREATE_ONLY', 'FULL_ACCESS', 'REJECT'], {
    required_error: 'Decision scope must be CREATE_ONLY, FULL_ACCESS, or REJECT',
  }),
});

export type PatientLookupInput = z.infer<typeof patientLookupSchema>;
export type CreateAssociationInput = z.infer<typeof createAssociationSchema>;
export type RequestAccessInput = z.infer<typeof requestAccessSchema>;
export type RespondAccessInput = z.infer<typeof respondAccessSchema>;
export type RevokeAssociationInput = z.infer<typeof revokeAssociationSchema>;
