import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createMedicationSchema, updateMedicationSchema } from '../validators/medication';
import { ZodError } from 'zod';

const router = Router();

// All medication routes require authentication
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

// GET /api/medications - return user's medications
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const medications = await prisma.medication.findMany({
      where: { userId },
      orderBy: [
        { isActive: 'desc' }, // Active medications first
        { name: 'asc' },
      ],
    });

    res.json({ medications });
  } catch (error) {
    next(error);
  }
});

// POST /api/medications - create medication with name, optional dosage/frequency
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createMedicationSchema.parse(req.body);
    const userId = req.user!.userId;

    const medication = await prisma.medication.create({
      data: {
        userId,
        name: data.name,
        dosage: data.dosage ?? null,
        frequency: data.frequency ?? null,
      },
    });

    res.status(201).json({ medication });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
});

// PATCH /api/medications/:id - update medication details
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateMedicationSchema.parse(req.body);
    const medicationId = req.params.id;
    const userId = req.user!.userId;

    // Check if there's anything to update
    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    // Find the medication
    const existingMedication = await prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!existingMedication) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }

    // Check ownership
    if (existingMedication.userId !== userId) {
      res.status(403).json({ error: 'Cannot modify another user\'s medication' });
      return;
    }

    const medication = await prisma.medication.update({
      where: { id: medicationId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.dosage !== undefined && { dosage: data.dosage }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    res.json({ medication });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
});

// DELETE /api/medications/:id - delete medication
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const medicationId = req.params.id;
    const userId = req.user!.userId;

    // Find the medication
    const existingMedication = await prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!existingMedication) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }

    // Check ownership
    if (existingMedication.userId !== userId) {
      res.status(403).json({ error: 'Cannot delete another user\'s medication' });
      return;
    }

    await prisma.medication.delete({
      where: { id: medicationId },
    });

    res.json({ message: 'Medication deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
