import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createMedicationSchema, updateMedicationSchema } from '../validators/medication';
import { AppError, ErrorCode } from '../errors';

const router = Router();

// All medication routes require authentication
router.use(authMiddleware);

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
      throw new AppError(400, 'No fields to update', ErrorCode.NO_FIELDS_TO_UPDATE);
    }

    // Find the medication
    const existingMedication = await prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!existingMedication) {
      throw new AppError(404, 'Medication not found', ErrorCode.MEDICATION_NOT_FOUND);
    }

    // Check ownership
    if (existingMedication.userId !== userId) {
      throw new AppError(403, "Cannot modify another user's medication", ErrorCode.CANNOT_MODIFY_OTHER_USER);
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
      throw new AppError(404, 'Medication not found', ErrorCode.MEDICATION_NOT_FOUND);
    }

    // Check ownership
    if (existingMedication.userId !== userId) {
      throw new AppError(403, "Cannot delete another user's medication", ErrorCode.CANNOT_DELETE_OTHER_USER);
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
