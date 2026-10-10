import { Router, type Request, type Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware';
import { profileToJson } from '../mappers';
import type { RowDataPacket } from 'mysql2';

const router = Router();

// Campos que el usuario puede editar. registration_paid / user_type NO están
// aquí a propósito: solo el servidor (pagos) o un admin pueden cambiarlos.
const EDITABLE: Record<string, number> = {
  full_name: 255,
  phone: 50,
  country: 100,
  city: 100,
  bio: 5000,
  avatar_url: 2000,
};

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  if (req.auth!.userId !== req.params.id) {
    return res.status(403).json({ error: 'You can only update your own profile.' });
  }

  const fields: string[] = [];
  const values: string[] = [];
  for (const [key, max] of Object.entries(EDITABLE)) {
    const value = (req.body as Record<string, unknown>)?.[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      return res.status(400).json({ error: `Invalid value for ${key}.` });
    }
    const clean = value.trim().slice(0, max);
    if (key === 'full_name' && !clean) {
      return res.status(400).json({ error: 'Your name cannot be empty.' });
    }
    if (key === 'avatar_url' && clean && !/^https?:\/\//i.test(clean)) {
      return res.status(400).json({ error: 'The photo must be an http(s) link.' });
    }
    fields.push(`${key} = ?`);
    values.push(clean);
  }
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  try {
    await pool.query(`UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id]);
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM profiles WHERE id = ? LIMIT 1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Profile not found.' });
    return res.status(200).json({ data: profileToJson(rows[0]) });
  } catch (err) {
    console.error('Profile update failed:', err);
    return res.status(500).json({ error: 'Profile update failed. Please try again.' });
  }
});

export default router;
