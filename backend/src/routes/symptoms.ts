import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createSymptomSchema, updateSymptomSchema } from '../validators/symptom';
import { ZodError } from 'zod';

const router = Router();

// All symptom routes require authentication
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
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
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
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    // Find the symptom
    const existingSymptom = await prisma.symptom.findUnique({
      where: { id: symptomId },
    });

    if (!existingSymptom) {
      res.status(404).json({ error: 'Symptom not found' });
      return;
    }

    // Check ownership - users can only modify their own symptoms, not system defaults
    if (existingSymptom.userId === null) {
      res.status(403).json({ error: 'Cannot modify system default symptoms' });
      return;
    }

    if (existingSymptom.userId !== userId) {
      res.status(403).json({ error: 'Cannot modify another user\'s symptom' });
      return;
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
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
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
      res.status(404).json({ error: 'Symptom not found' });
      return;
    }

    // Prevent deleting system defaults
    if (existingSymptom.userId === null) {
      res.status(403).json({ error: 'Cannot delete system default symptoms' });
      return;
    }

    // Check ownership
    if (existingSymptom.userId !== userId) {
      res.status(403).json({ error: 'Cannot delete another user\'s symptom' });
      return;
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
