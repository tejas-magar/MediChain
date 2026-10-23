import { z } from 'zod';

export const medicationItemSchema = z.object({
  name: z.string({ required_error: 'Medication name is required' }).trim().min(2),
  dosage: z.string({ required_error: 'Dosage is required (e.g. 500mg)' }).trim().min(1),
  frequency: z.string({ required_error: 'Frequency is required (e.g. Twice daily with meals)' }).trim().min(2),
  duration: z.string({ required_error: 'Duration is required (e.g. 10 days)' }).trim().min(1),
  instructions: z.string().trim().optional(),
  refills: z.number().int().min(0).default(0),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid({ message: 'Valid patient ID is required' }),
  title: z.string().trim().min(3, { message: 'Title must be at least 3 characters' }),
  clinicalIndication: z.string().trim().min(3, { message: 'Clinical indication or diagnosis is required' }),
  medications: z.array(medicationItemSchema).min(1, { message: 'At least one prescribed medication is required' }),
  notes: z.string().trim().optional(),
  fileStoragePath: z.string().optional(),
  mimeType: z.string().optional(),
});

export const labResultItemSchema = z.object({
  testName: z.string({ required_error: 'Test name is required' }).trim().min(2),
  value: z.string({ required_error: 'Observed value is required' }).trim().min(1),
  unit: z.string({ required_error: 'Unit of measurement is required' }).trim().min(1),
  referenceRange: z.string({ required_error: 'Reference range is required' }).trim().min(1),
  flag: z.enum(['NORMAL', 'HIGH', 'LOW', 'CRITICAL', 'ABNORMAL']).default('NORMAL'),
});

export const createLabReportSchema = z.object({
  patientId: z.string().uuid({ message: 'Valid patient ID is required' }),
  title: z.string().trim().min(3, { message: 'Title must be at least 3 characters' }),
  specimen: z.string().trim().min(2, { message: 'Specimen type is required (e.g. Blood, Urine)' }),
  collectionDate: z.string().trim().min(4, { message: 'Specimen collection timestamp is required' }),
  results: z.array(labResultItemSchema).min(1, { message: 'At least one diagnostic test result is required' }),
  interpretation: z.string().trim().optional(),
  fileStoragePath: z.string().optional(),
  mimeType: z.string().optional(),
});

export const amendDocumentSchema = z.object({
  amendmentReason: z
    .string({ required_error: 'Amendment reason is required' })
    .trim()
    .min(5, { message: 'A clear clinical or clerical amendment justification is required (min 5 chars)' }),
  title: z.string().trim().min(3).optional(),
  clinicalData: z.record(z.any(), { required_error: 'Amended clinical data structure is required' }),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type CreateLabReportInput = z.infer<typeof createLabReportSchema>;
export type AmendDocumentInput = z.infer<typeof amendDocumentSchema>;
