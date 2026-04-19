import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';
import { verifyToken } from '../services/auth/jwtService';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(createError('Unauthorized', 401));
  }

  try {
    const payload = verifyToken(token);
    (req as AuthedRequest).userId = payload.userId;
    next();
  } catch {
    next(createError('Invalid or expired token', 401));
  }
}

export interface AuthedRequest extends Request {
  userId: string;
}
