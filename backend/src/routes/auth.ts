import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth';
import { AppError, ErrorCode } from '../errors';

const router = Router();

// Helper to format user response (excludes sensitive fields)
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

// POST /api/auth/register
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = registerSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError(409, 'Email already registered', ErrorCode.EMAIL_ALREADY_EXISTS);
      }

      const passwordHash = await hashPassword(data.password);

      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          displayName: data.displayName || null,
        },
      });

      const tokens = generateTokens({ userId: user.id, email: user.email });

      res.status(201).json({
        user: formatUserResponse(user),
        ...tokens,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        throw new AppError(401, 'Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
      }

      const isValidPassword = await verifyPassword(
        data.password,
        user.passwordHash
      );

      if (!isValidPassword) {
        throw new AppError(401, 'Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
      }

      const tokens = generateTokens({ userId: user.id, email: user.email });

      res.json({
        user: formatUserResponse(user),
        ...tokens,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = refreshSchema.parse(req.body);

      let payload;
      try {
        payload = verifyRefreshToken(data.refreshToken);
      } catch {
        throw new AppError(401, 'Invalid or expired refresh token', ErrorCode.INVALID_REFRESH_TOKEN);
      }

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new AppError(401, 'User not found', ErrorCode.USER_NOT_FOUND);
      }

      const tokens = generateTokens({ userId: user.id, email: user.email });

      res.json(tokens);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/logout
router.post('/logout', async (_req: Request, res: Response) => {
  // For stateless JWT, logout is handled client-side by discarding tokens
  // In a production app, you might add the refresh token to a blocklist
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = forgotPasswordSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({
          message:
            'If an account with that email exists, a password reset link has been sent',
        });
        return;
      }

      // Delete any existing reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Generate a secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
        },
      });

      // Log the reset token (in production, send via email)
      console.log(`Password reset token for ${user.email}: ${resetToken}`);

      res.json({
        message:
          'If an account with that email exists, a password reset link has been sent',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = resetPasswordSchema.parse(req.body);

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: data.token },
        include: { user: true },
      });

      if (!resetToken) {
        throw new AppError(400, 'Invalid or expired reset token', ErrorCode.INVALID_RESET_TOKEN);
      }

      if (resetToken.expiresAt < new Date()) {
        // Delete expired token
        await prisma.passwordResetToken.delete({
          where: { id: resetToken.id },
        });
        throw new AppError(400, 'Invalid or expired reset token', ErrorCode.INVALID_RESET_TOKEN);
      }

      const passwordHash = await hashPassword(data.password);

      // Update password and delete the reset token
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash },
        }),
        prisma.passwordResetToken.delete({
          where: { id: resetToken.id },
        }),
      ]);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
