import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { config } from '../config.js';
import { comparePassword, hashPassword } from '../utils/crypto.js';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export class AuthService {
  public static generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, config.SESSION_SECRET, { expiresIn: '7d' });
  }

  public static verifyToken(token: string): AuthTokenPayload {
    return jwt.verify(token, config.SESSION_SECRET) as AuthTokenPayload;
  }

  public static async authenticate(email: string, password: string) {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

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

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  public static async createUser(data: { email: string; password: string; name: string; role: any }) {
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
