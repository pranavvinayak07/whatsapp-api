// backend/src/services/auth-service.ts
// Comprehensive server-side authentication, session rotation, and bootstrap management.

import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { config } from '../config.js';
import { comparePassword, hashPassword } from '../utils/crypto.js';
import { sessionStore } from './session-store.js';

export interface AuthTokenPayload {
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  name: string;
}

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number or special symbol.' };
  }
  return { valid: true };
}

export class AuthService {
  public static generateToken(payload: AuthTokenPayload, expiresIn: string = '7d'): string {
    return jwt.sign(payload, config.SESSION_SECRET, { expiresIn: expiresIn as any });
  }

  public static verifyToken(token: string): AuthTokenPayload {
    const payload = jwt.verify(token, config.SESSION_SECRET) as AuthTokenPayload;

    // Validate active session in server-side session registry
    if (payload.sessionId) {
      const activeSession = sessionStore.validateSession(payload.sessionId);
      if (!activeSession) {
        throw new Error('Session has expired or was terminated. Please log in again.');
      }
    }

    return payload;
  }

  public static async authenticate(
    email: string,
    password: string,
    metadata?: { ipAddress?: string; userAgent?: string; oldSessionId?: string }
  ) {
    const cleanEmail = email.toLowerCase().trim();
    let user = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      const candidateEmails = [
        cleanEmail.includes('@') ? null : `${cleanEmail}@vivegaa.edu`,
        cleanEmail.includes('@') ? null : `${cleanEmail}@vivegaaerp.in`,
        cleanEmail.endsWith('@vivegaaerp.in') ? cleanEmail.replace('@vivegaaerp.in', '@vivegaa.edu') : null,
        cleanEmail.endsWith('@vivegaa.edu') ? cleanEmail.replace('@vivegaa.edu', '@vivegaaerp.in') : null,
      ].filter(Boolean) as string[];

      for (const candidate of candidateEmails) {
        user = await db.user.findUnique({
          where: { email: candidate },
        });
        if (user) break;
      }
    }

    if (!user || !user.isActive) {
      throw new Error('Invalid email or password');
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create server-side session with rotation
    const session = sessionStore.createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      oldSessionId: metadata?.oldSessionId,
    });

    const token = this.generateToken({
      sessionId: session.sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return {
      token,
      sessionId: session.sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  public static logout(token?: string) {
    if (!token) return;
    try {
      const payload = jwt.decode(token) as AuthTokenPayload;
      if (payload && payload.sessionId) {
        sessionStore.invalidateSession(payload.sessionId);
      }
    } catch {
      // ignore decode error on logout
    }
  }

  public static async checkBootstrapStatus(): Promise<boolean> {
    const superAdminCount = await db.user.count({
      where: { role: 'SUPER_ADMIN' },
    });
    return superAdminCount === 0;
  }

  public static async bootstrapAdmin(data: { email: string; password: string; name: string }) {
    const isNeeded = await this.checkBootstrapStatus();
    if (!isNeeded) {
      throw new Error('Forbidden: An administrator account already exists. Bootstrap is disabled.');
    }

    const strength = validatePasswordStrength(data.password);
    if (!strength.valid) {
      throw new Error(strength.reason || 'Invalid password strength.');
    }

    const cleanEmail = data.email.toLowerCase().trim();
    const passwordHash = await hashPassword(data.password);

    return db.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name: data.name.trim() || 'Vivegaa Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  public static async createUser(data: { email: string; password: string; name: string; role: any }) {
    const strength = validatePasswordStrength(data.password);
    if (!strength.valid) {
      throw new Error(strength.reason || 'Invalid password strength.');
    }

    const existing = await db.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await hashPassword(data.password);
    return db.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        name: data.name,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
