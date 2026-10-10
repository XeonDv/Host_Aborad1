import type { NextFunction, Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import pool from './db';
import { verifyToken } from './auth';

export type Role = 'student' | 'host' | 'admin';

export interface AuthInfo {
  userId: string;
  email: string;
  role: Role;
  registrationPaid: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthInfo;
    }
  }
}

interface AuthRow extends RowDataPacket {
  id: string;
  email: string;
  user_type: Role;
  registration_paid: number;
}

// Lee el rol SIEMPRE de la base de datos, nunca del token: así un cambio de
// rol o un usuario borrado surte efecto de inmediato.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No session token provided.' });
  }
  const decoded = verifyToken(header.slice(7));
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
  try {
    const [rows] = await pool.query<AuthRow[]>(
      `SELECT u.id, u.email, p.user_type, p.registration_paid
         FROM users u JOIN profiles p ON p.id = u.id
        WHERE u.id = ? LIMIT 1`,
      [decoded.userId],
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
    const row = rows[0];
    req.auth = {
      userId: row.id,
      email: row.email,
      role: row.user_type,
      registrationPaid: !!row.registration_paid,
    };
    return next();
  } catch (err) {
    console.error('requireAuth failed:', err);
    return res.status(500).json({ error: 'Could not verify your session.' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    return next();
  };
}

// Los estudiantes solo ven homestays después de pagar la cuota de registro.
export function requirePaidAccess(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role === 'student' && !req.auth.registrationPaid) {
    return res.status(402).json({ error: 'Pay the registration fee to access homestays.' });
  }
  return next();
}

// Límite de intentos en memoria (suficiente para una sola instancia de Node).
export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
    } else {
      entry.count += 1;
      if (entry.count > options.max) {
        res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        return res
          .status(429)
          .json({ error: options.message ?? 'Too many attempts. Please try again later.' });
      }
    }
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    return next();
  };
}
