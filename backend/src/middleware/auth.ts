import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { AppError, ErrorCode } from '../errors';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError(401, 'No token provided', ErrorCode.NO_TOKEN_PROVIDED));
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token', ErrorCode.INVALID_TOKEN));
  }
}
