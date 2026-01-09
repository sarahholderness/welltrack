import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  createMoodLogSchema,
  updateMoodLogSchema,
  getMoodLogsQuerySchema,
} from '../validators/moodLog';
import { ZodError } from 'zod';

const router = Router();

// All mood log routes require authentication
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

// GET /api/mood-logs - return logs with date range filtering
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = getMoodLogsQuerySchema.parse(req.query);
    const userId = req.user!.userId;

    const { startDate, endDate, page, limit } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      userId: string;
      loggedAt?: { gte?: Date; lte?: Date };
    } = { userId };

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
    const total = await prisma.moodLog.count({ where });

    // Get logs
    const logs = await prisma.moodLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
      skip,
      take: limit,
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
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
});

// POST /api/mood-logs - create log with mood_score (1-5), optional energy/stress
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createMoodLogSchema.parse(req.body);
    const userId = req.user!.userId;

    const log = await prisma.moodLog.create({
      data: {
        userId,
        moodScore: data.moodScore,
        energyLevel: data.energyLevel ?? null,
        stressLevel: data.stressLevel ?? null,
        notes: data.notes ?? null,
        loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
      },
    });

    res.status(201).json({ log });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
});

// PATCH /api/mood-logs/:id - update existing log
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateMoodLogSchema.parse(req.body);
    const logId = req.params.id;
    const userId = req.user!.userId;

    // Check if there's anything to update
    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    // Find the log
    const existingLog = await prisma.moodLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      res.status(404).json({ error: 'Mood log not found' });
      return;
    }

    // Check ownership
    if (existingLog.userId !== userId) {
      res.status(403).json({ error: 'Cannot modify another user\'s log' });
      return;
    }

    const log = await prisma.moodLog.update({
      where: { id: logId },
      data: {
        ...(data.moodScore !== undefined && { moodScore: data.moodScore }),
        ...(data.energyLevel !== undefined && { energyLevel: data.energyLevel }),
        ...(data.stressLevel !== undefined && { stressLevel: data.stressLevel }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.loggedAt !== undefined && { loggedAt: new Date(data.loggedAt) }),
      },
    });

    res.json({ log });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
});

// DELETE /api/mood-logs/:id - delete log
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logId = req.params.id;
    const userId = req.user!.userId;

    // Find the log
    const existingLog = await prisma.moodLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      res.status(404).json({ error: 'Mood log not found' });
      return;
    }

    // Check ownership
    if (existingLog.userId !== userId) {
      res.status(403).json({ error: 'Cannot delete another user\'s log' });
      return;
    }

    await prisma.moodLog.delete({
      where: { id: logId },
    });

    res.json({ message: 'Mood log deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
