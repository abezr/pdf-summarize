/**
 * Custom Application Error
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly metadata: any;

  constructor(message: string, statusCode: number = 500, metadata: any = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.metadata = metadata;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}
