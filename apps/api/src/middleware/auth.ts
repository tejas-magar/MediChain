import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  session: Request['session'] & {
    userId: string;
    role: UserRole;
    userEmail: string;
  };
}

/**
 * Middleware: Enforces that the request has an active, authenticated server session.
 * Rejects with 401 Unauthorized if no valid session exists.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session || !req.session.userId) {
    res.status(401).json({
      error: 'Unauthorized: Authentication is required to access this resource.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }
  next();
};

/**
 * Middleware: Enforces that the authenticated user possesses one of the allowed roles.
 * Must be preceded by requireAuth.
 * Rejects with 403 Forbidden if the user's role is not allowed.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session || !req.session.userId || !req.session.role) {
      res.status(401).json({
        error: 'Unauthorized: Valid session required.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!allowedRoles.includes(req.session.role)) {
      res.status(403).json({
        error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Current role: ${req.session.role}`,
        code: 'ROLE_FORBIDDEN',
        allowedRoles,
        currentRole: req.session.role,
      });
      return;
    }

    next();
  };
};
