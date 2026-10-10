import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import pool from '../db';
import { signToken } from '../auth';
import { rateLimit, requireAuth } from '../middleware';
import { profileToJson } from '../mappers';
import { EMAIL_RE, str } from '../validate';
import type { RowDataPacket } from 'mysql2';

const router = Router();

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string;
}

// Hash de relleno: así el login tarda lo mismo exista o no el correo.
const DUMMY_HASH = bcrypt.hashSync('hostabroad-not-a-real-password', 10);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many attempts. Please wait a few minutes and try again.',
});

router.post('/signup', authLimiter, async (req: Request, res: Response) => {
  const email = str(req.body?.email, 255).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const fullName = str(req.body?.fullName, 255);
  const userType = req.body?.userType;

  if (!email || !password || !userType || !fullName) {
    return res.status(400).json({ error: 'Please fill in your name, email, password and account type.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (password.length < 8 || password.length > 200) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  // Los administradores NUNCA se crean desde el registro público (ver npm run make-admin).
  if (userType !== 'student' && userType !== 'host') {
    return res.status(400).json({ error: 'Invalid account type. Choose student or host.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.query<UserRow[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    await conn.query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [userId, email, passwordHash]);
    await conn.query('INSERT INTO profiles (id, user_type, full_name) VALUES (?, ?, ?)', [userId, userType, fullName]);
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM profiles WHERE id = ? LIMIT 1', [userId]);
    await conn.commit();

    const token = signToken({ userId, email });
    return res.status(201).json({
      data: { session: { token, user: { id: userId, email } }, profile: profileToJson(rows[0]) },
    });
  } catch (err: unknown) {
    if (conn) await conn.rollback().catch(() => undefined);
    const code = (err as { code?: string }).code;
    if (code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Signup failed:', err);
    return res.status(500).json({ error: 'Sign-up failed. Please try again in a moment.' });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const email = str(req.body?.email, 255).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password.' });
  }

  try {
    const [users] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    const user = users[0];
    const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const [profiles] = await pool.query<RowDataPacket[]>('SELECT * FROM profiles WHERE id = ? LIMIT 1', [user.id]);
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profile not found for this user.' });
    }
    const token = signToken({ userId: user.id, email: user.email });
    return res.status(200).json({
      data: {
        session: { token, user: { id: user.id, email: user.email } },
        profile: profileToJson(profiles[0]),
      },
    });
  } catch (err) {
    console.error('Login failed:', err);
    return res.status(500).json({ error: 'Sign-in failed. Please try again in a moment.' });
  }
});

router.get('/session', requireAuth, async (req: Request, res: Response) => {
  try {
    const [profiles] = await pool.query<RowDataPacket[]>('SELECT * FROM profiles WHERE id = ? LIMIT 1', [
      req.auth!.userId,
    ]);
    if (profiles.length === 0) return res.status(404).json({ error: 'Profile not found.' });
    return res.status(200).json({
      data: {
        user: { id: req.auth!.userId, email: req.auth!.email },
        profile: profileToJson(profiles[0]),
      },
    });
  } catch (err) {
    console.error('Session check failed:', err);
    return res.status(500).json({ error: 'Session check failed.' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  return res.status(200).json({ data: null });
});

export default router;
