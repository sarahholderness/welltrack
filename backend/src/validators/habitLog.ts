import { z } from 'zod';

export const createHabitLogSchema = z.object({
  habitId: z.string().uuid('Invalid habit ID'),
  valueBoolean: z.boolean().optional(),
  valueNumeric: z.number().optional(),
  valueDuration: z.number().int().min(0, 'Duration must be non-negative').optional(),
  notes: z.string().max(1000, 'Notes must be at most 1000 characters').optional(),
  loggedAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
});

export const updateHabitLogSchema = z.object({
  valueBoolean: z.boolean().nullable().optional(),
  valueNumeric: z.number().nullable().optional(),
  valueDuration: z.number().int().min(0, 'Duration must be non-negative').nullable().optional(),
  notes: z.string().max(1000, 'Notes must be at most 1000 characters').nullable().optional(),
  loggedAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
});

export const getHabitLogsQuerySchema = z.object({
  startDate: z.string().datetime({ message: 'Invalid start date format' }).optional(),
  endDate: z.string().datetime({ message: 'Invalid end date format' }).optional(),
  habitId: z.string().uuid('Invalid habit ID').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateHabitLogInput = z.infer<typeof createHabitLogSchema>;
export type UpdateHabitLogInput = z.infer<typeof updateHabitLogSchema>;
export type GetHabitLogsQuery = z.infer<typeof getHabitLogsQuerySchema>;
