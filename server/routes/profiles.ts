import { Router, type Request, type Response } from 'express';
import pool from '../db';
import { verifyToken } from '../auth';
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

const ALLOWED_FIELDS = new Set([
  'full_name', 'phone', 'country', 'city', 'bio', 'avatar_url',
  'registration_paid', 'registration_fee_paid_at',
]);

router.patch('/:id', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No session token provided.' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  if (decoded.userId !== req.params.id) {
    return res.status(403).json({ error: 'You can only update your own profile.' });
  }

  const updates = req.body as Record<string, unknown>;
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_FIELDS.has(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  try {
    await pool.query(
      `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`,
      [...values, req.params.id]
    );

    const [rows] = await pool.query<ProfileRow[]>(
      'SELECT * FROM profiles WHERE id = ? LIMIT 1',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    return res.status(200).json({ data: profileRowToJson(rows[0]) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Profile update failed: ${message}` });
  }
});

export default router;
