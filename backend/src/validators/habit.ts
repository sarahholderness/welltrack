import { z } from 'zod';

const trackingTypeEnum = z.enum(['boolean', 'numeric', 'duration']);

export const createHabitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  trackingType: trackingTypeEnum,
  unit: z.string().max(50, 'Unit must be at most 50 characters').optional(),
});

export const updateHabitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
  trackingType: trackingTypeEnum.optional(),
  unit: z.string().max(50, 'Unit must be at most 50 characters').nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
