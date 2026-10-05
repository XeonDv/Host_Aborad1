import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'hostabroad-dev-secret';

export function signToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}
