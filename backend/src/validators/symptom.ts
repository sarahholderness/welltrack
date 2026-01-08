import { z } from 'zod';

export const createSymptomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  category: z.string().max(100, 'Category must be at most 100 characters').optional(),
});

export const updateSymptomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
  category: z.string().max(100, 'Category must be at most 100 characters').nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateSymptomInput = z.infer<typeof createSymptomSchema>;
export type UpdateSymptomInput = z.infer<typeof updateSymptomSchema>;
