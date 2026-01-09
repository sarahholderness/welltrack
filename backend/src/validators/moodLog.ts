import { z } from 'zod';

export const createMoodLogSchema = z.object({
  moodScore: z.number().int().min(1, 'Mood score must be at least 1').max(5, 'Mood score must be at most 5'),
  energyLevel: z.number().int().min(1, 'Energy level must be at least 1').max(5, 'Energy level must be at most 5').optional(),
  stressLevel: z.number().int().min(1, 'Stress level must be at least 1').max(5, 'Stress level must be at most 5').optional(),
  notes: z.string().max(1000, 'Notes must be at most 1000 characters').optional(),
  loggedAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
});

export const updateMoodLogSchema = z.object({
  moodScore: z.number().int().min(1, 'Mood score must be at least 1').max(5, 'Mood score must be at most 5').optional(),
  energyLevel: z.number().int().min(1, 'Energy level must be at least 1').max(5, 'Energy level must be at most 5').nullable().optional(),
  stressLevel: z.number().int().min(1, 'Stress level must be at least 1').max(5, 'Stress level must be at most 5').nullable().optional(),
  notes: z.string().max(1000, 'Notes must be at most 1000 characters').nullable().optional(),
  loggedAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
});

export const getMoodLogsQuerySchema = z.object({
  startDate: z.string().datetime({ message: 'Invalid start date format' }).optional(),
  endDate: z.string().datetime({ message: 'Invalid end date format' }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMoodLogInput = z.infer<typeof createMoodLogSchema>;
export type UpdateMoodLogInput = z.infer<typeof updateMoodLogSchema>;
export type GetMoodLogsQuery = z.infer<typeof getMoodLogsQuerySchema>;
