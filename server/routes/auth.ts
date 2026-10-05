import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import pool from '../db';
import { signToken, verifyToken } from '../auth';
import type { RowDataPacket } from 'mysql2';

const router = Router();

interface ProfileRow extends RowDataPacket {
  id: string;
  user_type: 'student' | 'host' | 'admin';
  full_name: string;
  phone: string;
  country: string;
  city: string;
  bio: string | null;
  avatar_url: string | null;
  registration_paid: number;
  registration_fee_paid_at: string | null;
  created_at: string;
}

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

function profileRowToJson(row: ProfileRow) {
  return {
    id: row.id,
    user_type: row.user_type,
    full_name: row.full_name,
    phone: row.phone,
    country: row.country,
    city: row.city,
    bio: row.bio ?? '',
    avatar_url: row.avatar_url ?? '',
    registration_paid: !!row.registration_paid,
    registration_fee_paid_at: row.registration_fee_paid_at ?? null,
    created_at: row.created_at,
  };
}

router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, userType, fullName } = req.body;

  if (!email || !password || !userType || !fullName) {
    return res.status(400).json({
      error: 'Missing required fields: email, password, userType, fullName',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  if (!['student', 'host', 'admin'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid user type. Must be student, host, or admin.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.query<UserRow[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await conn.query(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, email, passwordHash]
    );

    await conn.query(
      'INSERT INTO profiles (id, user_type, full_name) VALUES (?, ?, ?)',
      [userId, userType, fullName]
    );

    const [rows] = await conn.query<ProfileRow[]>(
      'SELECT * FROM profiles WHERE id = ? LIMIT 1',
      [userId]
    );

    await conn.commit();

    const profile = profileRowToJson(rows[0]);
    const token = signToken({ userId, email });
    return res.status(201).json({
      data: {
        session: { token, user: { id: userId, email } },
        profile,
      },
    });
  } catch (err: unknown) {
    if (conn) await conn.rollback();
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code;
    let detail = message;
    if (code === 'ER_ACCESS_DENIED_ERROR') {
      detail = `MySQL access denied — check DB_USER and DB_PASSWORD. Original: ${message}`;
    } else if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
      detail = `Cannot reach MySQL server at ${process.env.DB_HOST}:${process.env.DB_PORT}. Original: ${message}`;
    } else if (code === 'ER_BAD_DB_ERROR') {
      detail = `Database "${process.env.DB_NAME}" not found. Original: ${message}`;
    }
    return res.status(500).json({ error: `Sign-up failed: ${detail}` });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password.' });
  }

  try {
    const [users] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const [profiles] = await pool.query<ProfileRow[]>(
      'SELECT * FROM profiles WHERE id = ? LIMIT 1',
      [user.id]
    );
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profile not found for this user.' });
    }

    const profile = profileRowToJson(profiles[0]);
    const token = signToken({ userId: user.id, email: user.email });
    return res.status(200).json({
      data: {
        session: { token, user: { id: user.id, email: user.email } },
        profile,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Login failed: ${message}` });
  }
});

router.get('/session', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No session token provided.' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  try {
    const [users] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [decoded.userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const [profiles] = await pool.query<ProfileRow[]>(
      'SELECT * FROM profiles WHERE id = ? LIMIT 1',
      [decoded.userId]
    );
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    return res.status(200).json({
      data: {
        user: { id: users[0].id, email: users[0].email },
        profile: profileRowToJson(profiles[0]),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Session check failed: ${message}` });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  return res.status(200).json({ data: null });
});

export default router;
