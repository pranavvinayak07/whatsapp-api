// backend/src/services/session-store.ts
// Secure server-side session registry with rotation, expiration, and instant invalidation on logout.

import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export interface ActiveSession {
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  name: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
}

class SessionStoreService {
  private sessions: Map<string, ActiveSession> = new Map();
  // Map of userId -> Set of sessionIds for quick user-level revocation
  private userSessions: Map<string, Set<string>> = new Map();

  constructor() {
    // Periodically prune expired sessions every 10 minutes
    setInterval(() => this.pruneExpiredSessions(), 10 * 60 * 1000).unref();
  }

  /**
   * Generates a cryptographically random session identifier.
   */
  public generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Creates and registers a new active server-side session.
   * If a previous session ID is provided, rotates and revokes the old one.
   */
  public createSession(data: {
    userId: string;
    email: string;
    role: string;
    name: string;
    ipAddress?: string;
    userAgent?: string;
    ttlMs?: number;
    oldSessionId?: string;
  }): ActiveSession {
    // Prevent session fixation: revoke old session if provided
    if (data.oldSessionId) {
      this.invalidateSession(data.oldSessionId);
    }

    const sessionId = this.generateSessionId();
    const now = Date.now();
    const ttl = data.ttlMs || 7 * 24 * 60 * 60 * 1000; // 7 days default
    const expiresAt = now + ttl;

    const session: ActiveSession = {
      sessionId,
      userId: data.userId,
      email: data.email,
      role: data.role,
      name: data.name,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: now,
      lastActiveAt: now,
      expiresAt,
    };

    this.sessions.set(sessionId, session);

    if (!this.userSessions.has(data.userId)) {
      this.userSessions.set(data.userId, new Set());
    }
    this.userSessions.get(data.userId)!.add(sessionId);

    return session;
  }

  /**
   * Validates if a session exists, is active, and has not expired.
   */
  public validateSession(sessionId: string): ActiveSession | null {
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const now = Date.now();
    if (now > session.expiresAt) {
      this.invalidateSession(sessionId);
      return null;
    }

    // Touch last active
    session.lastActiveAt = now;
    return session;
  }

  /**
   * Invalidates and terminates a session immediately (e.g., on logout).
   */
  public invalidateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessions.delete(sessionId);
    const userSet = this.userSessions.get(session.userId);
    if (userSet) {
      userSet.delete(sessionId);
      if (userSet.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    return true;
  }

  /**
   * Invalidates all sessions for a user (e.g., password reset / account lock).
   */
  public invalidateAllUserSessions(userId: string): number {
    const set = this.userSessions.get(userId);
    if (!set) return 0;

    let count = 0;
    for (const sid of set) {
      this.sessions.delete(sid);
      count++;
    }
    this.userSessions.delete(userId);
    return count;
  }

  /**
   * Prunes all expired sessions.
   */
  public pruneExpiredSessions(): void {
    const now = Date.now();
    for (const [sid, sess] of this.sessions.entries()) {
      if (now > sess.expiresAt) {
        this.invalidateSession(sid);
      }
    }
  }

  /**
   * Returns active sessions count for monitoring.
   */
  public getActiveCount(): number {
    return this.sessions.size;
  }
}

export const sessionStore = new SessionStoreService();
