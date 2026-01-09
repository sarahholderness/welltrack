import { z } from 'zod';

export const createSymptomLogSchema = z.object({
  symptomId: z.string().uuid('Invalid symptom ID'),
  severity: z.number().int().min(1, 'Severity must be at least 1').max(10, 'Severity must be at most 10'),
  notes: z.string().max(1000, 'Notes must be at most 1000 characters').optional(),
  loggedAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
});

export const updateSymptomLogSchema = z.object({
  severity: z.number().int().min(1, 'Severity must be at least 1').max(10, 'Severity must be at most 10').optional(),
  notes: z.string().max(1000, 'Notes must be at most 1000 characters').nullable().optional(),
  loggedAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
});

export const getSymptomLogsQuerySchema = z.object({
  startDate: z.string().datetime({ message: 'Invalid start date format' }).optional(),
  endDate: z.string().datetime({ message: 'Invalid end date format' }).optional(),
  symptomId: z.string().uuid('Invalid symptom ID').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSymptomLogInput = z.infer<typeof createSymptomLogSchema>;
export type UpdateSymptomLogInput = z.infer<typeof updateSymptomLogSchema>;
export type GetSymptomLogsQuery = z.infer<typeof getSymptomLogsQuerySchema>;
