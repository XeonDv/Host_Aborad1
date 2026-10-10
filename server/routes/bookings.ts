import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware';
import { bookingToJson, listingToJson, publicProfileToJson } from '../mappers';
import { isDate, monthsBetween } from '../validate';

const router = Router();
router.use(requireAuth);

type Status = 'pending' | 'confirmed' | 'cancelled' | 'completed';

// Quién puede pasar de qué estado a cuál.
const TRANSITIONS: Record<'host' | 'student', Partial<Record<Status, Status[]>>> = {
  host: { pending: ['confirmed', 'cancelled'], confirmed: ['cancelled', 'completed'] },
  student: { pending: ['cancelled'], confirmed: ['cancelled'] },
};

async function withRelations(rows: RowDataPacket[], includeStudent: boolean) {
  if (rows.length === 0) return [];
  const listingIds = [...new Set(rows.map((r) => r.listing_id as string))];
  const [listings] = await pool.query<RowDataPacket[]>('SELECT * FROM listings WHERE id IN (?)', [listingIds]);
  const listingMap = new Map(listings.map((l) => [l.id as string, listingToJson(l)]));

  let studentMap = new Map<string, ReturnType<typeof publicProfileToJson>>();
  if (includeStudent) {
    const studentIds = [...new Set(rows.map((r) => r.student_id as string))];
    const [students] = await pool.query<RowDataPacket[]>('SELECT * FROM profiles WHERE id IN (?)', [studentIds]);
    studentMap = new Map(students.map((s) => [s.id as string, publicProfileToJson(s)]));
  }
  return rows.map((r) => ({
    ...bookingToJson(r),
    listing: listingMap.get(r.listing_id) ?? null,
    ...(includeStudent ? { student: studentMap.get(r.student_id) ?? null } : {}),
  }));
}

// Mis reservas (estudiante) o solicitudes sobre mi homestay (anfitrión)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.auth!;
    let rows: RowDataPacket[];
    if (role === 'host') {
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT b.* FROM bookings b JOIN listings l ON l.id = b.listing_id
          WHERE l.host_id = ? ORDER BY b.created_at DESC`, [userId]);
    } else {
      [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM bookings WHERE student_id = ? ORDER BY created_at DESC', [userId]);
    }
    return res.json({ data: await withRelations(rows, role === 'host') });
  } catch (err) {
    console.error('List bookings failed:', err);
    return res.status(500).json({ error: 'Could not load bookings.' });
  }
});

// Solicitar una reserva (solo estudiantes que ya pagaron la cuota)
router.post('/', requireRole('student'), async (req: Request, res: Response) => {
  if (!req.auth!.registrationPaid) {
    return res.status(402).json({ error: 'Pay the registration fee before requesting a booking.' });
  }
  const { listing_id, room_id, check_in, check_out } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof listing_id !== 'string' || typeof room_id !== 'string') {
    return res.status(400).json({ error: 'Please select a room to book.' });
  }
  if (!isDate(check_in) || !isDate(check_out)) {
    return res.status(400).json({ error: 'Please select your check-in and check-out dates.' });
  }
  if (check_out <= check_in) {
    return res.status(400).json({ error: 'Check-out must be after check-in.' });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (check_in < today) {
    return res.status(400).json({ error: 'Check-in cannot be in the past.' });
  }

  try {
    const [rooms] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rooms WHERE id = ? AND listing_id = ? LIMIT 1', [room_id, listing_id]);
    if (rooms.length === 0) return res.status(404).json({ error: 'That room is not part of this homestay.' });
    const room = rooms[0];

    // Meses y total los calcula el servidor: nunca se confía en el precio del navegador.
    const months = monthsBetween(check_in, check_out);
    if (months > Number(room.max_stay_months)) {
      return res.status(400).json({ error: `The maximum stay for this room is ${room.max_stay_months} months.` });
    }
    const total = months * Number(room.price_per_month);

    const id = randomUUID();
    await pool.query(
      `INSERT INTO bookings (id, student_id, listing_id, room_id, check_in, check_out, months, total_amount, status)
       VALUES (?,?,?,?,?,?,?,?, 'pending')`,
      [id, req.auth!.userId, listing_id, room_id, check_in, check_out, months, total],
    );
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM bookings WHERE id = ?', [id]);
    return res.status(201).json({ data: bookingToJson(rows[0]) });
  } catch (err) {
    console.error('Create booking failed:', err);
    return res.status(500).json({ error: 'Could not create your booking request.' });
  }
});

// Cambiar el estado (confirmar / cancelar / completar)
router.patch('/:id/status', async (req: Request, res: Response) => {
  const next = (req.body as { status?: Status })?.status;
  if (!next || !['pending', 'confirmed', 'cancelled', 'completed'].includes(next)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT b.*, l.host_id FROM bookings b JOIN listings l ON l.id = b.listing_id WHERE b.id = ? LIMIT 1`,
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found.' });
    const booking = rows[0];

    const { userId, role } = req.auth!;
    let actor: 'host' | 'student' | 'admin' | null = null;
    if (role === 'admin') actor = 'admin';
    else if (booking.host_id === userId) actor = 'host';
    else if (booking.student_id === userId) actor = 'student';
    if (!actor) return res.status(404).json({ error: 'Booking not found.' });

    if (actor !== 'admin') {
      const allowed = TRANSITIONS[actor][booking.status as Status] ?? [];
      if (!allowed.includes(next)) {
        return res.status(400).json({ error: `You cannot change a ${booking.status} booking to ${next}.` });
      }
    }
    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [next, req.params.id]);
    return res.json({ data: { id: req.params.id, status: next } });
  } catch (err) {
    console.error('Update booking failed:', err);
    return res.status(500).json({ error: 'Could not update this booking.' });
  }
});

export default router;
