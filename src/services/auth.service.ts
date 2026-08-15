import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'byteflow-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface RegisterInput {
  name: string;
  username: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthPayload {
  id: string;
  username: string;
  name: string;
  role: Role;
}

function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export class AuthService {
  static async register(input: RegisterInput) {
    const trimmedName = input.name?.trim();
    const trimmedUsername = input.username?.trim().toLowerCase();
    const password = input.password;

    if (!trimmedName) {
      throw { statusCode: 400, message: 'Name is required' };
    }
    if (!trimmedUsername) {
      throw { statusCode: 400, message: 'Username is required' };
    }
    if (!password || password.length < 6) {
      throw { statusCode: 400, message: 'Password must be at least 6 characters' };
    }

    // Enforce 10-user limit only when creating a new user and pressing submit
    const userCount = await prisma.user.count();
    if (userCount >= 10) {
      throw { statusCode: 400, message: 'User limit reached. Maximum 10 users allowed.' };
    }

    const existing = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (existing) {
      throw { statusCode: 409, message: 'Username already taken' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Public registration always assigns MEMBER role (Admins can only be promoted or seeded)
    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        username: trimmedUsername,
        password: hashedPassword,
        role: Role.MEMBER,
      },
    });

    const token = generateToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async login(input: LoginInput) {
    const trimmedUsername = input.username?.trim().toLowerCase();
    const password = input.password;

    if (!trimmedUsername) {
      throw { statusCode: 400, message: 'Username is required' };
    }
    if (!password) {
      throw { statusCode: 400, message: 'Password is required' };
    }

    const user = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (!user) {
      throw { statusCode: 401, message: 'Invalid username or password' };
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid username or password' };
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    return user;
  }
}
