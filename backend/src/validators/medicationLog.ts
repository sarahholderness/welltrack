import { z } from 'zod';

export const createMedicationLogSchema = z.object({
  medicationId: z.string().uuid('Invalid medication ID'),
  taken: z.boolean(),
  takenAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
  notes: z.string().max(1000, 'Notes must be at most 1000 characters').optional(),
});

export const updateMedicationLogSchema = z.object({
  taken: z.boolean().optional(),
  takenAt: z.string().datetime({ message: 'Invalid datetime format' }).nullable().optional(),
  notes: z.string().max(1000, 'Notes must be at most 1000 characters').nullable().optional(),
});

export const getMedicationLogsQuerySchema = z.object({
  startDate: z.string().datetime({ message: 'Invalid start date format' }).optional(),
  endDate: z.string().datetime({ message: 'Invalid end date format' }).optional(),
  medicationId: z.string().uuid('Invalid medication ID').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMedicationLogInput = z.infer<typeof createMedicationLogSchema>;
export type UpdateMedicationLogInput = z.infer<typeof updateMedicationLogSchema>;
export type GetMedicationLogsQuery = z.infer<typeof getMedicationLogsQuerySchema>;
