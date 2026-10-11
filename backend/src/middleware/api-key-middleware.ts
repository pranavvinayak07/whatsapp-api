import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { config } from '../config.js';
import { requireAuth, AuthenticatedRequest } from './auth-middleware.js';
import { hashApiKey } from '../utils/crypto.js';

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const resource = req.path.replace(/^\/api\/v1(?=\/)/, '').split('/').filter(Boolean)[0];
  const allowedResources = ['messages', 'contacts', 'templates', 'automation', 'campaigns', 'connection', 'queue', 'media'];
  if (!allowedResources.includes(resource)) return res.status(403).json({ error: 'Unsupported API resource' });
  const scope = `${resource}:${req.method === 'GET' ? 'read' : 'write'}`;
  // Dashboard sessions use the same endpoints without exposing service keys.
  if (!req.headers['x-api-key'] && !req.headers.authorization && req.cookies?.token) {
    return requireAuth(req, res, () => {
      const role = (req as AuthenticatedRequest).user?.role;
      const permitted = role === 'SUPER_ADMIN' || role === 'ADMIN' ||
        (role === 'MESSAGING_STAFF' && ['messages', 'contacts', 'templates', 'media'].includes(resource) &&
          (req.method === 'GET' || ['messages', 'contacts'].includes(resource))) ||
        (role === 'VIEWER' && req.method === 'GET' && ['messages', 'contacts', 'templates', 'media'].includes(resource));
      if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });
      next();
    });
  }
  const apiKey = (req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')) as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key. Provide via X-API-Key header.' });
  }

  // 1. Allow internal master service key
  if (apiKey === config.INTERNAL_API_KEY) {
    return next();
  }

  // 2. Lookup key in database
  const keyHash = hashApiKey(apiKey);
  const found = await db.apiKey.findFirst({
    where: {
      keyHash,
      isRevoked: false,
    },
  });

  if (!found) {
    return res.status(401).json({ error: 'Invalid or revoked API key' });
  }

  if (found.expiresAt && found.expiresAt < new Date()) {
    return res.status(401).json({ error: 'API key has expired' });
  }

  if (!found.scopes.includes(scope)) return res.status(403).json({ error: `Required scope: ${scope}` });

  // Update last used asynchronously
  db.apiKey.update({
    where: { id: found.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  next();
}
