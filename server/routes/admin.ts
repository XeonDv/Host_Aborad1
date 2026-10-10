import { Router, type Request, type Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware';
import { bookingToJson, listingToJson, profileToJson } from '../mappers';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/profiles', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, u.email FROM profiles p JOIN users u ON u.id = p.id ORDER BY p.created_at DESC`);
    return res.json({ data: rows.map((r) => ({ ...profileToJson(r), email: r.email as string })) });
  } catch (err) {
    console.error('Admin profiles failed:', err);
    return res.status(500).json({ error: 'Could not load users.' });
  }
});

router.get('/listings', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT l.*, p.full_name AS host_name, u.email AS host_email
         FROM listings l
         LEFT JOIN profiles p ON p.id = l.host_id
         LEFT JOIN users u ON u.id = l.host_id
        ORDER BY l.created_at DESC`);
    return res.json({
      data: rows.map((r) => ({ ...listingToJson(r), host_name: r.host_name ?? '', host_email: r.host_email ?? '' })),
    });
  } catch (err) {
    console.error('Admin listings failed:', err);
    return res.status(500).json({ error: 'Could not load homestays.' });
  }
});

router.get('/bookings', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT b.*, l.title AS listing_title, l.city AS listing_city,
              p.full_name AS student_name, u.email AS student_email
         FROM bookings b
         LEFT JOIN listings l ON l.id = b.listing_id
         LEFT JOIN profiles p ON p.id = b.student_id
         LEFT JOIN users u ON u.id = b.student_id
        ORDER BY b.created_at DESC`);
    return res.json({
      data: rows.map((r) => ({
        ...bookingToJson(r),
        listing_title: r.listing_title ?? '',
        listing_city: r.listing_city ?? '',
        student_name: r.student_name ?? '',
        student_email: r.student_email ?? '',
      })),
    });
  } catch (err) {
    console.error('Admin bookings failed:', err);
    return res.status(500).json({ error: 'Could not load bookings.' });
  }
});

export default router;
