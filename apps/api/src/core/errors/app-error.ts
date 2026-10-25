import { ERROR_CODES, type ApiErrorDetail, type ErrorCode } from '@erp/shared';

/** Operational error that is safe to return to the client. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: ApiErrorDetail[]) {
    return new AppError(400, ERROR_CODES.VALIDATION_ERROR, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(401, ERROR_CODES.UNAUTHORIZED, message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message);
  }
  static invalidTransition(message = 'This action is not allowed in the current status') {
    return new AppError(409, ERROR_CODES.INVALID_STATUS_TRANSITION, message);
  }
  static insufficientStock(details: ApiErrorDetail[]) {
    return new AppError(409, ERROR_CODES.INSUFFICIENT_STOCK, 'Insufficient stock', details);
  }
  static conflict(message: string, code: ErrorCode = ERROR_CODES.CONFLICT) {
    return new AppError(409, code, message);
  }
}
