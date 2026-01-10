import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createSymptomSchema, updateSymptomSchema } from '../validators/symptom';
import { AppError, ErrorCode } from '../errors';

const router = Router();

// All symptom routes require authentication
router.use(authMiddleware);

// GET /api/symptoms - return system defaults + user's custom symptoms
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Get system defaults (userId is null) and user's custom symptoms
    const symptoms = await prisma.symptom.findMany({
      where: {
        OR: [
          { userId: null }, // System defaults
          { userId: userId }, // User's custom symptoms
        ],
      },
      orderBy: [
        { userId: 'asc' }, // System defaults first (null comes before strings)
        { name: 'asc' },
      ],
    });

    res.json({ symptoms });
  } catch (error) {
    next(error);
  }
});

// POST /api/symptoms - create custom symptom for user
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createSymptomSchema.parse(req.body);
    const userId = req.user!.userId;

    const symptom = await prisma.symptom.create({
      data: {
        userId,
        name: data.name,
        category: data.category || null,
      },
    });

    res.status(201).json({ symptom });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/symptoms/:id - update symptom (name, category, is_active)
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateSymptomSchema.parse(req.body);
    const symptomId = req.params.id;
    const userId = req.user!.userId;

    // Check if there's anything to update
    if (Object.keys(data).length === 0) {
      throw new AppError(400, 'No fields to update', ErrorCode.NO_FIELDS_TO_UPDATE);
    }

    // Find the symptom
    const existingSymptom = await prisma.symptom.findUnique({
      where: { id: symptomId },
    });

    if (!existingSymptom) {
      throw new AppError(404, 'Symptom not found', ErrorCode.SYMPTOM_NOT_FOUND);
    }

    // Check ownership - users can only modify their own symptoms, not system defaults
    if (existingSymptom.userId === null) {
      throw new AppError(403, 'Cannot modify system default symptoms', ErrorCode.CANNOT_MODIFY_SYSTEM_DEFAULT);
    }

    if (existingSymptom.userId !== userId) {
      throw new AppError(403, "Cannot modify another user's symptom", ErrorCode.CANNOT_MODIFY_OTHER_USER);
    }

    const symptom = await prisma.symptom.update({
      where: { id: symptomId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    res.json({ symptom });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/symptoms/:id - delete custom symptom (prevent deleting system defaults)
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const symptomId = req.params.id;
    const userId = req.user!.userId;

    // Find the symptom
    const existingSymptom = await prisma.symptom.findUnique({
      where: { id: symptomId },
    });

    if (!existingSymptom) {
      throw new AppError(404, 'Symptom not found', ErrorCode.SYMPTOM_NOT_FOUND);
    }

    // Prevent deleting system defaults
    if (existingSymptom.userId === null) {
      throw new AppError(403, 'Cannot delete system default symptoms', ErrorCode.CANNOT_MODIFY_SYSTEM_DEFAULT);
    }

    // Check ownership
    if (existingSymptom.userId !== userId) {
      throw new AppError(403, "Cannot delete another user's symptom", ErrorCode.CANNOT_DELETE_OTHER_USER);
    }

    await prisma.symptom.delete({
      where: { id: symptomId },
    });

    res.json({ message: 'Symptom deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
