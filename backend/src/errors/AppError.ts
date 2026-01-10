import { ErrorCode } from './errorCodes';

export interface ValidationDetail {
  field: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  details?: ValidationDetail[];
}

/**
 * Custom error class for operational errors in the API.
 * These are expected errors (validation, auth, not found, etc.)
 * as opposed to programming errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ValidationDetail[];
  public readonly isOperational: boolean = true;

  constructor(
    statusCode: number,
    message: string,
    code: ErrorCode,
    details?: ValidationDetail[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert to response format (backward compatible with existing API)
   */
  toResponse(): ErrorResponse {
    const response: ErrorResponse = {
      error: this.message,
    };

    if (this.details && this.details.length > 0) {
      response.details = this.details;
    }

    return response;
  }

  // Factory methods for common error types

  static badRequest(
    message: string,
    code: ErrorCode = ErrorCode.VALIDATION_FAILED
  ): AppError {
    return new AppError(400, message, code);
  }

  static validation(details: ValidationDetail[]): AppError {
    return new AppError(
      400,
      'Validation failed',
      ErrorCode.VALIDATION_FAILED,
      details
    );
  }

  static unauthorized(
    message: string,
    code: ErrorCode = ErrorCode.INVALID_TOKEN
  ): AppError {
    return new AppError(401, message, code);
  }

  static forbidden(
    message: string,
    code: ErrorCode = ErrorCode.CANNOT_MODIFY_OTHER_USER
  ): AppError {
    return new AppError(403, message, code);
  }

  static notFound(
    message: string,
    code: ErrorCode = ErrorCode.NOT_FOUND
  ): AppError {
    return new AppError(404, message, code);
  }

  static conflict(
    message: string,
    code: ErrorCode = ErrorCode.EMAIL_ALREADY_EXISTS
  ): AppError {
    return new AppError(409, message, code);
  }

  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(500, message, ErrorCode.INTERNAL_ERROR);
  }
}
