import { z } from 'zod';

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(100).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
