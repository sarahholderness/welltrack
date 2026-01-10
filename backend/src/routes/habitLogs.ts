import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  createHabitLogSchema,
  updateHabitLogSchema,
  getHabitLogsQuerySchema,
} from '../validators/habitLog';
import { AppError, ErrorCode } from '../errors';

const router = Router();

// All habit log routes require authentication
router.use(authMiddleware);

// GET /api/habit-logs - return logs with date range filtering
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = getHabitLogsQuerySchema.parse(req.query);
    const userId = req.user!.userId;

    const { startDate, endDate, habitId, page, limit } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      userId: string;
      habitId?: string;
      loggedAt?: { gte?: Date; lte?: Date };
    } = { userId };

    if (habitId) {
      where.habitId = habitId;
    }

    if (startDate || endDate) {
      where.loggedAt = {};
      if (startDate) {
        where.loggedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.loggedAt.lte = new Date(endDate);
      }
    }

    // Get total count for pagination
    const total = await prisma.habitLog.count({ where });

    // Get logs with habit details
    const logs = await prisma.habitLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
      skip,
      take: limit,
      include: {
        habit: {
          select: {
            id: true,
            name: true,
            trackingType: true,
            unit: true,
          },
        },
      },
    });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/habit-logs - create log with appropriate value field based on tracking_type
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createHabitLogSchema.parse(req.body);
    const userId = req.user!.userId;

    // Verify the habit exists and user can log it (system default or own habit)
    const habit = await prisma.habit.findUnique({
      where: { id: data.habitId },
    });

    if (!habit) {
      throw new AppError(404, 'Habit not found', ErrorCode.HABIT_NOT_FOUND);
    }

    // User can log system defaults (userId = null) or their own habits
    if (habit.userId !== null && habit.userId !== userId) {
      throw new AppError(403, "Cannot log another user's habit", ErrorCode.CANNOT_LOG_OTHER_USER);
    }

    // Validate that the appropriate value field is provided based on tracking type
    const hasBoolean = data.valueBoolean !== undefined;
    const hasNumeric = data.valueNumeric !== undefined;
    const hasDuration = data.valueDuration !== undefined;

    if (habit.trackingType === 'boolean' && !hasBoolean) {
      throw new AppError(400, 'valueBoolean is required for boolean habits', ErrorCode.VALUE_BOOLEAN_REQUIRED);
    }
    if (habit.trackingType === 'numeric' && !hasNumeric) {
      throw new AppError(400, 'valueNumeric is required for numeric habits', ErrorCode.VALUE_NUMERIC_REQUIRED);
    }
    if (habit.trackingType === 'duration' && !hasDuration) {
      throw new AppError(400, 'valueDuration is required for duration habits', ErrorCode.VALUE_DURATION_REQUIRED);
    }

    const log = await prisma.habitLog.create({
      data: {
        userId,
        habitId: data.habitId,
        valueBoolean: data.valueBoolean ?? null,
        valueNumeric: data.valueNumeric ?? null,
        valueDuration: data.valueDuration ?? null,
        notes: data.notes ?? null,
        loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
      },
      include: {
        habit: {
          select: {
            id: true,
            name: true,
            trackingType: true,
            unit: true,
          },
        },
      },
    });

    res.status(201).json({ log });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/habit-logs/:id - update log
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateHabitLogSchema.parse(req.body);
    const logId = req.params.id;
    const userId = req.user!.userId;

    // Check if there's anything to update
    if (Object.keys(data).length === 0) {
      throw new AppError(400, 'No fields to update', ErrorCode.NO_FIELDS_TO_UPDATE);
    }

    // Find the log
    const existingLog = await prisma.habitLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      throw new AppError(404, 'Habit log not found', ErrorCode.HABIT_LOG_NOT_FOUND);
    }

    // Check ownership
    if (existingLog.userId !== userId) {
      throw new AppError(403, "Cannot modify another user's log", ErrorCode.CANNOT_MODIFY_OTHER_USER);
    }

    const log = await prisma.habitLog.update({
      where: { id: logId },
      data: {
        ...(data.valueBoolean !== undefined && { valueBoolean: data.valueBoolean }),
        ...(data.valueNumeric !== undefined && { valueNumeric: data.valueNumeric }),
        ...(data.valueDuration !== undefined && { valueDuration: data.valueDuration }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.loggedAt !== undefined && { loggedAt: new Date(data.loggedAt) }),
      },
      include: {
        habit: {
          select: {
            id: true,
            name: true,
            trackingType: true,
            unit: true,
          },
        },
      },
    });

    res.json({ log });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/habit-logs/:id - delete log
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logId = req.params.id;
    const userId = req.user!.userId;

    // Find the log
    const existingLog = await prisma.habitLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      throw new AppError(404, 'Habit log not found', ErrorCode.HABIT_LOG_NOT_FOUND);
    }

    // Check ownership
    if (existingLog.userId !== userId) {
      throw new AppError(403, "Cannot delete another user's log", ErrorCode.CANNOT_DELETE_OTHER_USER);
    }

    await prisma.habitLog.delete({
      where: { id: logId },
    });

    res.json({ message: 'Habit log deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
