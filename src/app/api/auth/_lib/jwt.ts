import 'server-only';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

export interface JWTPayload {
  address: string;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export const ACCESS_TOKEN_MAX_AGE = 10; // 1 hour
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function generateAccessToken(address: string): string {
  return jwt.sign(
    { address, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_MAX_AGE }
  );
}

export function generateRefreshToken(address: string): string {
  return jwt.sign(
    { address, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_MAX_AGE }
  );
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (decoded?.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (decoded?.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
}