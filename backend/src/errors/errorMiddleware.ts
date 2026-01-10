import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './AppError';

/**
 * Global error handling middleware.
 *
 * Handles:
 * - AppError instances (our custom operational errors)
 * - ZodError instances (validation errors from schema parsing)
 * - Unknown errors (fallback to 500 Internal Server Error)
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle our custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toResponse());
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Log unexpected errors
  console.error(err.stack);

  // Unknown errors - return generic 500
  res.status(500).json({ error: 'Internal server error' });
}

/**
 * 404 handler for undefined routes.
 * Should be placed after all route definitions.
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}
