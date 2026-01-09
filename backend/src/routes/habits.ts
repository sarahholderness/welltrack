import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createHabitSchema, updateHabitSchema } from '../validators/habit';
import { ZodError } from 'zod';
import { TrackingType } from '../generated/prisma/enums';

const router = Router();

// All habit routes require authentication
router.use(authMiddleware);

// Helper to handle Zod validation errors
function handleZodError(error: ZodError, res: Response): void {
  res.status(400).json({
    error: 'Validation failed',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

// GET /api/habits - return system defaults + user's custom habits
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Get system defaults (userId is null) and user's custom habits
    const habits = await prisma.habit.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [{ userId: 'asc' }, { name: 'asc' }], // System defaults first (null), then user's
    });

    res.json({ habits });
  } catch (error) {
    next(error);
  }
});

// POST /api/habits - create custom habit with tracking_type
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createHabitSchema.parse(req.body);
    const userId = req.user!.userId;

    const habit = await prisma.habit.create({
      data: {
        userId,
        name: data.name,
        trackingType: data.trackingType as TrackingType,
        unit: data.unit ?? null,
      },
    });

    res.status(201).json({ habit });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
});

// PATCH /api/habits/:id - update habit details
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateHabitSchema.parse(req.body);
    const habitId = req.params.id;
    const userId = req.user!.userId;

    // Check if there's anything to update
    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    // Find the habit
    const existingHabit = await prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!existingHabit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    // Check if it's a system default (userId is null)
    if (existingHabit.userId === null) {
      res.status(403).json({ error: 'Cannot modify system default habits' });
      return;
    }

    // Check ownership
    if (existingHabit.userId !== userId) {
      res.status(403).json({ error: "Cannot modify another user's habit" });
      return;
    }

    const habit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.trackingType !== undefined && { trackingType: data.trackingType as TrackingType }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    res.json({ habit });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
});

// DELETE /api/habits/:id - delete custom habit
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const habitId = req.params.id;
    const userId = req.user!.userId;

    // Find the habit
    const existingHabit = await prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!existingHabit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    // Check if it's a system default (userId is null)
    if (existingHabit.userId === null) {
      res.status(403).json({ error: 'Cannot delete system default habits' });
      return;
    }

    // Check ownership
    if (existingHabit.userId !== userId) {
      res.status(403).json({ error: "Cannot delete another user's habit" });
      return;
    }

    await prisma.habit.delete({
      where: { id: habitId },
    });

    res.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
