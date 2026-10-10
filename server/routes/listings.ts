import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '../db';
import { requireAuth, requirePaidAccess, requireRole } from '../middleware';
import { listingToJson, publicProfileToJson, roomToJson } from '../mappers';
import { parseListingInput, ROOM_TYPES, type ListingInput } from '../validate';

const router = Router();
router.use(requireAuth, requirePaidAccess);

// Campos del listing que se calculan a partir de las habitaciones.
function derived(input: ListingInput) {
  return {
    price_per_month: Math.min(...input.rooms.map((r) => r.price_per_month)),
    room_type: input.rooms[0].room_type,
    max_stay_months: Math.max(...input.rooms.map((r) => r.max_stay_months)),
  };
}

// Lista (con filtros)
router.get('/', async (req: Request, res: Response) => {
  const where: string[] = [];
  const params: (string | number)[] = [];

  const city = typeof req.query.city === 'string' ? req.query.city : '';
  if (city) { where.push('l.city = ?'); params.push(city); }

  const roomType = typeof req.query.room_type === 'string' ? req.query.room_type : '';
  if (roomType) {
    if (!(ROOM_TYPES as readonly string[]).includes(roomType)) {
      return res.status(400).json({ error: 'Invalid room type.' });
    }
    where.push('l.room_type = ?'); params.push(roomType);
  }
  if (req.query.meals === 'true') where.push('l.meals_included = 1');

  const maxPrice = typeof req.query.max_price === 'string' && req.query.max_price !== '' ? Number(req.query.max_price) : null;
  if (maxPrice !== null) {
    if (!Number.isFinite(maxPrice)) return res.status(400).json({ error: 'Invalid max price.' });
    where.push('l.price_per_month <= ?'); params.push(maxPrice);
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT l.*, (SELECT COUNT(*) FROM rooms r WHERE r.listing_id = l.id) AS room_count
         FROM listings l
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY l.created_at DESC`,
      params,
    );
    return res.json({ data: rows.map(listingToJson) });
  } catch (err) {
    console.error('List listings failed:', err);
    return res.status(500).json({ error: 'Could not load homestays.' });
  }
});

// El homestay del anfitrión que inició sesión (con sus habitaciones)
router.get('/mine', requireRole('host'), async (req: Request, res: Response) => {
  try {
    const [ls] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM listings WHERE host_id = ? ORDER BY created_at DESC',
      [req.auth!.userId],
    );
    let rooms: RowDataPacket[] = [];
    if (ls.length > 0) {
      [rooms] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM rooms WHERE listing_id IN (?) ORDER BY created_at ASC',
        [ls.map((l) => l.id)],
      );
    }
    return res.json({ data: { listings: ls.map(listingToJson), rooms: rooms.map(roomToJson) } });
  } catch (err) {
    console.error('Load my listings failed:', err);
    return res.status(500).json({ error: 'Could not load your homestay.' });
  }
});

// Detalle
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [ls] = await pool.query<RowDataPacket[]>('SELECT * FROM listings WHERE id = ? LIMIT 1', [req.params.id]);
    if (ls.length === 0) return res.status(404).json({ error: 'Homestay not found.' });
    const [hosts] = await pool.query<RowDataPacket[]>('SELECT * FROM profiles WHERE id = ? LIMIT 1', [ls[0].host_id]);
    const [rooms] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rooms WHERE listing_id = ? ORDER BY created_at ASC',
      [req.params.id],
    );
    return res.json({
      data: {
        listing: listingToJson(ls[0]),
        host: hosts[0] ? publicProfileToJson(hosts[0]) : null,
        rooms: rooms.map(roomToJson),
      },
    });
  } catch (err) {
    console.error('Load listing failed:', err);
    return res.status(500).json({ error: 'Could not load this homestay.' });
  }
});

async function writeRooms(conn: PoolConnection, listingId: string, input: ListingInput) {
  const keep: string[] = [];
  for (const r of input.rooms) {
    const photos = JSON.stringify(r.photo_urls);
    if (r.id) {
      const [result] = await conn.query(
        `UPDATE rooms SET title=?, description=?, room_type=?, beds=?, price_per_month=?, photo_urls=?,
                available_from=?, available_to=?, max_stay_months=?
          WHERE id = ? AND listing_id = ?`,
        [r.title, r.description, r.room_type, r.beds, r.price_per_month, photos,
         r.available_from, r.available_to, r.max_stay_months, r.id, listingId],
      );
      if ((result as { affectedRows: number }).affectedRows === 0) {
        // Puede ser "0 filas cambiadas" por datos idénticos: confirmamos que exista.
        const [exists] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM rooms WHERE id = ? AND listing_id = ?', [r.id, listingId]);
        if (exists.length === 0) throw new Error('ROOM_NOT_IN_LISTING');
      }
      keep.push(r.id);
    } else {
      const id = randomUUID();
      await conn.query(
        `INSERT INTO rooms (id, listing_id, title, description, room_type, beds, price_per_month, photo_urls,
                            available_from, available_to, max_stay_months)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [id, listingId, r.title, r.description, r.room_type, r.beds, r.price_per_month, photos,
         r.available_from, r.available_to, r.max_stay_months],
      );
      keep.push(id);
    }
  }
  // Habitaciones que el anfitrión quitó del formulario
  await conn.query('DELETE FROM rooms WHERE listing_id = ? AND id NOT IN (?)', [listingId, keep]);
}

// Crear (un anfitrión tiene un solo homestay, con varias habitaciones)
router.post('/', requireRole('host'), async (req: Request, res: Response) => {
  const parsed = parseListingInput(req.body);
  if (!parsed.value) return res.status(400).json({ error: parsed.error });
  const input = parsed.value;

  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.query<RowDataPacket[]>('SELECT id FROM listings WHERE host_id = ? LIMIT 1 FOR UPDATE', [req.auth!.userId]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'You already have a homestay. Edit it instead.', id: existing[0].id });
    }

    const id = randomUUID();
    const d = derived(input);
    await conn.query(
      `INSERT INTO listings (id, host_id, title, description, city, neighbourhood, price_per_month, room_type,
                             meals_included, amenities, photo_urls, max_stay_months)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, req.auth!.userId, input.title, input.description, input.city, input.neighbourhood,
       d.price_per_month, d.room_type, input.meals_included ? 1 : 0,
       JSON.stringify(input.amenities), JSON.stringify(input.photo_urls), d.max_stay_months],
    );
    await writeRooms(conn, id, input);
    await conn.commit();
    return res.status(201).json({ data: { id } });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => undefined);
    console.error('Create listing failed:', err);
    return res.status(500).json({ error: 'Could not save your homestay. Please try again.' });
  } finally {
    conn?.release();
  }
});

// Editar (solo el dueño)
router.put('/:id', requireRole('host'), async (req: Request, res: Response) => {
  const parsed = parseListingInput(req.body);
  if (!parsed.value) return res.status(400).json({ error: parsed.error });
  const input = parsed.value;

  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [owned] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM listings WHERE id = ? AND host_id = ? LIMIT 1 FOR UPDATE',
      [req.params.id, req.auth!.userId],
    );
    if (owned.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Homestay not found.' });
    }

    const d = derived(input);
    await conn.query(
      `UPDATE listings SET title=?, description=?, city=?, neighbourhood=?, price_per_month=?, room_type=?,
              meals_included=?, amenities=?, photo_urls=?, max_stay_months=?
        WHERE id = ?`,
      [input.title, input.description, input.city, input.neighbourhood, d.price_per_month, d.room_type,
       input.meals_included ? 1 : 0, JSON.stringify(input.amenities), JSON.stringify(input.photo_urls),
       d.max_stay_months, req.params.id],
    );
    await writeRooms(conn, req.params.id as string, input);
    await conn.commit();
    return res.json({ data: { id: req.params.id } });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => undefined);
    if (err instanceof Error && err.message === 'ROOM_NOT_IN_LISTING') {
      return res.status(400).json({ error: 'One of the rooms does not belong to this homestay.' });
    }
    console.error('Update listing failed:', err);
    return res.status(500).json({ error: 'Could not save your homestay. Please try again.' });
  } finally {
    conn?.release();
  }
});

// Borrar (solo el dueño; se van también habitaciones y reservas por CASCADE)
router.delete('/:id', requireRole('host'), async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query('DELETE FROM listings WHERE id = ? AND host_id = ?', [req.params.id, req.auth!.userId]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return res.status(404).json({ error: 'Homestay not found.' });
    }
    return res.json({ data: null });
  } catch (err) {
    console.error('Delete listing failed:', err);
    return res.status(500).json({ error: 'Could not delete this homestay.' });
  }
});

export default router;
