import { z } from 'zod';

export const createMedicationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  dosage: z.string().max(100, 'Dosage must be at most 100 characters').optional(),
  frequency: z.string().max(100, 'Frequency must be at most 100 characters').optional(),
});

export const updateMedicationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
  dosage: z.string().max(100, 'Dosage must be at most 100 characters').nullable().optional(),
  frequency: z.string().max(100, 'Frequency must be at most 100 characters').nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
