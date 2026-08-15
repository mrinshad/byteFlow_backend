import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type AuthPayload } from '../services/auth.service.js';
import { prisma } from '../prisma.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required' },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  let payload: AuthPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token' },
    });
    return;
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { isLocked: true, deletedAt: true },
    });

    if (!dbUser || dbUser.deletedAt) {
      res.status(401).json({
        success: false,
        error: { message: 'Account deactivated or no longer exists' },
      });
      return;
    }

    if (dbUser.isLocked) {
      res.status(403).json({
        success: false,
        error: { message: 'Your account has been locked by an administrator. Please contact support.' },
      });
      return;
    }

    req.user = payload;
  } catch (err) {
    next(err);
    return;
  }

  next();
}
