import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { updateUserSchema } from '../validators/user';
import { getUserStats } from '../services/userStats';
import { AppError, ErrorCode } from '../errors';

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
      throw new AppError(404, 'User not found', ErrorCode.USER_NOT_FOUND);
    }

    res.json({ user: formatUserResponse(user) });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/me/stats - Get current user's aggregated statistics
router.get('/me/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await getUserStats(req.user!.userId);
    res.json({ stats });
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
        throw new AppError(400, 'No fields to update', ErrorCode.NO_FIELDS_TO_UPDATE);
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
