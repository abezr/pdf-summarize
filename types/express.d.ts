import { Request } from 'express';

// Extend Express Request interface to include validated data and user info
declare global {
  namespace Express {
    interface Request {
      validatedBody?: unknown;
      validatedQuery?: unknown;
      validatedParams?: unknown;
      user?: { id: string }; // For future authentication
    }
  }
}

export {};
