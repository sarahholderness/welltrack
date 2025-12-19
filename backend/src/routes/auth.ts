import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/password';
import { generateTokens } from '../utils/jwt';
import { registerSchema } from '../validators/auth';
import { ZodError } from 'zod';

const router = Router();

router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate input
      const data = registerSchema.parse(req.body);

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          displayName: data.displayName || null,
        },
      });

      // Generate tokens
      const tokens = generateTokens({ userId: user.id, email: user.email });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          timezone: user.timezone,
          createdAt: user.createdAt,
        },
        ...tokens,
      });
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

export default router;
