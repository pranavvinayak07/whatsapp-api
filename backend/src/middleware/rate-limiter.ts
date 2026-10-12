// backend/src/middleware/rate-limiter.ts
// Brute-force protection & login rate limiting for authentication endpoints.

import { Request, Response, NextFunction } from 'express';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

class LoginRateLimiter {
  private attempts: Map<string, AttemptRecord> = new Map();
  private maxAttempts: number;
  private windowMs: number;
  private blockDurationMs: number;

  constructor(options?: { maxAttempts?: number; windowMs?: number; blockDurationMs?: number }) {
    this.maxAttempts = options?.maxAttempts || 5; // 5 failed attempts
    this.windowMs = options?.windowMs || 15 * 60 * 1000; // 15 minute window
    this.blockDurationMs = options?.blockDurationMs || 15 * 60 * 1000; // 15 minute lockout

    // Prune stale records every 15 minutes
    setInterval(() => this.prune(), 15 * 60 * 1000).unref();
  }

  private getKey(req: Request): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const identifier = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
    return `${ip}:${identifier}`;
  }

  public check(req: Request): { blocked: boolean; retryAfterSeconds: number } {
    const key = this.getKey(req);
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      return { blocked: false, retryAfterSeconds: 0 };
    }

    if (record.blockedUntil && now < record.blockedUntil) {
      const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return { blocked: true, retryAfterSeconds };
    }

    // If block expired or window passed
    if (now - record.firstAttemptAt > this.windowMs) {
      this.attempts.delete(key);
      return { blocked: false, retryAfterSeconds: 0 };
    }

    return { blocked: false, retryAfterSeconds: 0 };
  }

  public recordFailure(req: Request): { blocked: boolean; remaining: number } {
    const key = this.getKey(req);
    const now = Date.now();
    let record = this.attempts.get(key);

    if (!record || now - record.firstAttemptAt > this.windowMs) {
      record = { count: 1, firstAttemptAt: now, blockedUntil: null };
      this.attempts.set(key, record);
    } else {
      record.count += 1;
    }

    if (record.count >= this.maxAttempts) {
      record.blockedUntil = now + this.blockDurationMs;
      return { blocked: true, remaining: 0 };
    }

    return { blocked: false, remaining: this.maxAttempts - record.count };
  }

  public recordSuccess(req: Request): void {
    const key = this.getKey(req);
    this.attempts.delete(key);
  }

  public prune(): void {
    const now = Date.now();
    for (const [k, v] of this.attempts.entries()) {
      if (v.blockedUntil && now > v.blockedUntil) {
        this.attempts.delete(k);
      } else if (now - v.firstAttemptAt > this.windowMs) {
        this.attempts.delete(k);
      }
    }
  }
}

export const loginRateLimiter = new LoginRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationMs: 15 * 60 * 1000,
});

export function loginRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const status = loginRateLimiter.check(req);
  if (status.blocked) {
    res.setHeader('Retry-After', status.retryAfterSeconds);
    return res.status(429).json({
      error: `Too many failed login attempts. Account temporarily locked for security. Please try again in ${Math.ceil(
        status.retryAfterSeconds / 60
      )} minutes.`,
      retryAfterSeconds: status.retryAfterSeconds,
    });
  }
  next();
}
