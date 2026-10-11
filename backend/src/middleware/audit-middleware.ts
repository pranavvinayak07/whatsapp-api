import { Response, NextFunction } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from './auth-middleware.js';
import { logger } from '../utils/logger.js';

export function auditAction(actionName: string, entityType: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Record audit after response completes
    res.on('finish', async () => {
      if (res.statusCode < 400 && req.user) {
        try {
          await db.auditLog.create({
            data: {
              userId: req.user.userId,
              userEmail: req.user.email,
              action: actionName,
              entityType,
              entityId: req.params.id || req.body?.id || undefined,
              details: {
                method: req.method,
                path: req.originalUrl,
                status: res.statusCode,
              },
              ipAddress: req.ip || req.socket.remoteAddress,
              userAgent: req.headers['user-agent'],
            },
          });
        } catch (err) {
          logger.error({ err }, 'Failed to record audit log');
        }
      }
    });

    next();
  };
}
