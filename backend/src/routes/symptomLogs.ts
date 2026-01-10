import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  createSymptomLogSchema,
  updateSymptomLogSchema,
  getSymptomLogsQuerySchema,
} from '../validators/symptomLog';
import { AppError, ErrorCode } from '../errors';

const router = Router();

// All symptom log routes require authentication
router.use(authMiddleware);

// GET /api/symptom-logs - return logs with date range filtering, pagination
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = getSymptomLogsQuerySchema.parse(req.query);
    const userId = req.user!.userId;

    const { startDate, endDate, symptomId, page, limit } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      userId: string;
      loggedAt?: { gte?: Date; lte?: Date };
      symptomId?: string;
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

    if (symptomId) {
      where.symptomId = symptomId;
    }

    // Get total count for pagination
    const total = await prisma.symptomLog.count({ where });

    // Get logs with symptom details
    const logs = await prisma.symptomLog.findMany({
      where,
      include: {
        symptom: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
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
    next(error);
  }
});

// POST /api/symptom-logs - create new log with severity (1-10), optional notes
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createSymptomLogSchema.parse(req.body);
    const userId = req.user!.userId;

    // Verify the symptom exists and user has access to it
    const symptom = await prisma.symptom.findUnique({
      where: { id: data.symptomId },
    });

    if (!symptom) {
      throw new AppError(404, 'Symptom not found', ErrorCode.SYMPTOM_NOT_FOUND);
    }

    // User can log system defaults (userId null) or their own custom symptoms
    if (symptom.userId !== null && symptom.userId !== userId) {
      throw new AppError(403, "Cannot log another user's symptom", ErrorCode.CANNOT_LOG_OTHER_USER);
    }

    const log = await prisma.symptomLog.create({
      data: {
        userId,
        symptomId: data.symptomId,
        severity: data.severity,
        notes: data.notes || null,
        loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
      },
      include: {
        symptom: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    res.status(201).json({ log });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/symptom-logs/:id - update existing log
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateSymptomLogSchema.parse(req.body);
    const logId = req.params.id;
    const userId = req.user!.userId;

    // Check if there's anything to update
    if (Object.keys(data).length === 0) {
      throw new AppError(400, 'No fields to update', ErrorCode.NO_FIELDS_TO_UPDATE);
    }

    // Find the log
    const existingLog = await prisma.symptomLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      throw new AppError(404, 'Symptom log not found', ErrorCode.SYMPTOM_LOG_NOT_FOUND);
    }

    // Check ownership
    if (existingLog.userId !== userId) {
      throw new AppError(403, "Cannot modify another user's log", ErrorCode.CANNOT_MODIFY_OTHER_USER);
    }

    const log = await prisma.symptomLog.update({
      where: { id: logId },
      data: {
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.loggedAt !== undefined && { loggedAt: new Date(data.loggedAt) }),
      },
      include: {
        symptom: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    res.json({ log });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/symptom-logs/:id - delete log
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logId = req.params.id;
    const userId = req.user!.userId;

    // Find the log
    const existingLog = await prisma.symptomLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      throw new AppError(404, 'Symptom log not found', ErrorCode.SYMPTOM_LOG_NOT_FOUND);
    }

    // Check ownership
    if (existingLog.userId !== userId) {
      throw new AppError(403, "Cannot delete another user's log", ErrorCode.CANNOT_DELETE_OTHER_USER);
    }

    await prisma.symptomLog.delete({
      where: { id: logId },
    });

    res.json({ message: 'Symptom log deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
