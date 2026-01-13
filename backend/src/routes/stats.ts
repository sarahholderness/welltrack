import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getUserStats } from '../services/userStats';

const router = Router();

// All stats routes require authentication
router.use(authMiddleware);

// GET /api/stats - Get current user's aggregated statistics
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await getUserStats(req.user!.userId);
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

export default router;
