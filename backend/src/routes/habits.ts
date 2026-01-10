import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createHabitSchema, updateHabitSchema } from '../validators/habit';
import { AppError, ErrorCode } from '../errors';
import { TrackingType } from '../generated/prisma/enums';

const router = Router();

// All habit routes require authentication
router.use(authMiddleware);

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
      throw new AppError(400, 'No fields to update', ErrorCode.NO_FIELDS_TO_UPDATE);
    }

    // Find the habit
    const existingHabit = await prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!existingHabit) {
      throw new AppError(404, 'Habit not found', ErrorCode.HABIT_NOT_FOUND);
    }

    // Check if it's a system default (userId is null)
    if (existingHabit.userId === null) {
      throw new AppError(403, 'Cannot modify system default habits', ErrorCode.CANNOT_MODIFY_SYSTEM_DEFAULT);
    }

    // Check ownership
    if (existingHabit.userId !== userId) {
      throw new AppError(403, "Cannot modify another user's habit", ErrorCode.CANNOT_MODIFY_OTHER_USER);
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
      throw new AppError(404, 'Habit not found', ErrorCode.HABIT_NOT_FOUND);
    }

    // Check if it's a system default (userId is null)
    if (existingHabit.userId === null) {
      throw new AppError(403, 'Cannot delete system default habits', ErrorCode.CANNOT_MODIFY_SYSTEM_DEFAULT);
    }

    // Check ownership
    if (existingHabit.userId !== userId) {
      throw new AppError(403, "Cannot delete another user's habit", ErrorCode.CANNOT_DELETE_OTHER_USER);
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
