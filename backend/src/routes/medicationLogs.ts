import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  createMedicationLogSchema,
  updateMedicationLogSchema,
  getMedicationLogsQuerySchema,
} from '../validators/medicationLog';
import { ZodError } from 'zod';

const router = Router();

// All medication log routes require authentication
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

// GET /api/medication-logs - return logs with date range filtering
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = getMedicationLogsQuerySchema.parse(req.query);
    const userId = req.user!.userId;

    const { startDate, endDate, medicationId, page, limit } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      userId: string;
      medicationId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = { userId };

    if (medicationId) {
      where.medicationId = medicationId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get total count for pagination
    const total = await prisma.medicationLog.count({ where });

    // Get logs with medication details
    const logs = await prisma.medicationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            dosage: true,
            frequency: true,
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
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
});

// POST /api/medication-logs - log medication taken/not taken
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createMedicationLogSchema.parse(req.body);
    const userId = req.user!.userId;

    // Verify the medication exists and belongs to the user
    const medication = await prisma.medication.findUnique({
      where: { id: data.medicationId },
    });

    if (!medication) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }

    if (medication.userId !== userId) {
      res.status(403).json({ error: "Cannot log another user's medication" });
      return;
    }

    const log = await prisma.medicationLog.create({
      data: {
        userId,
        medicationId: data.medicationId,
        taken: data.taken,
        takenAt: data.takenAt ? new Date(data.takenAt) : null,
        notes: data.notes ?? null,
      },
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            dosage: true,
            frequency: true,
          },
        },
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

// PATCH /api/medication-logs/:id - update log
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateMedicationLogSchema.parse(req.body);
    const logId = req.params.id;
    const userId = req.user!.userId;

    // Check if there's anything to update
    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    // Find the log
    const existingLog = await prisma.medicationLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      res.status(404).json({ error: 'Medication log not found' });
      return;
    }

    // Check ownership
    if (existingLog.userId !== userId) {
      res.status(403).json({ error: "Cannot modify another user's log" });
      return;
    }

    const log = await prisma.medicationLog.update({
      where: { id: logId },
      data: {
        ...(data.taken !== undefined && { taken: data.taken }),
        ...(data.takenAt !== undefined && {
          takenAt: data.takenAt ? new Date(data.takenAt) : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            dosage: true,
            frequency: true,
          },
        },
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

// DELETE /api/medication-logs/:id - delete log
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logId = req.params.id;
    const userId = req.user!.userId;

    // Find the log
    const existingLog = await prisma.medicationLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      res.status(404).json({ error: 'Medication log not found' });
      return;
    }

    // Check ownership
    if (existingLog.userId !== userId) {
      res.status(403).json({ error: "Cannot delete another user's log" });
      return;
    }

    await prisma.medicationLog.delete({
      where: { id: logId },
    });

    res.json({ message: 'Medication log deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
