import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { updateUserSchema } from '../validators/user';
import { ZodError } from 'zod';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// Helper to format user response
function formatUserResponse(user: {
  id: string;
  email: string;
  displayName: string | null;
  timezone: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
}

// GET /api/users/me - Get current user's profile
router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: formatUserResponse(user) });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/me - Update current user's profile
router.patch(
  '/me',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateUserSchema.parse(req.body);

      // Check if there's anything to update
      if (!data.displayName && !data.timezone) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: {
          ...(data.displayName !== undefined && { displayName: data.displayName }),
          ...(data.timezone !== undefined && { timezone: data.timezone }),
        },
      });

      res.json({ user: formatUserResponse(user) });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }
      next(error);
    }
  }
);

// DELETE /api/users/me - Delete current user and all their data
router.delete(
  '/me',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Prisma cascade delete will handle all related records
      await prisma.user.delete({
        where: { id: req.user!.userId },
      });

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
