export const ROOM_TYPES = ['Private room', 'Shared room', 'Studio'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

// Solo http(s): evita URLs tipo javascript: en <img src> y enlaces.
export function urlList(value: unknown, maxItems: number): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length > 2000 || !/^https?:\/\//i.test(item)) return null;
    out.push(item);
  }
  return out;
}

export function stringList(value: unknown, maxItems: number, maxLen: number): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length > maxLen) return null;
    out.push(item.trim());
  }
  return out;
}

// Misma fórmula que monthsBetween() del frontend (src/lib/format.ts).
export function monthsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00Z`);
  const b = new Date(`${checkOut}T00:00:00Z`);
  const months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  return Math.max(1, months);
}

export interface RoomInput {
  id: string | null;
  title: string;
  description: string;
  room_type: RoomType;
  beds: number;
  price_per_month: number;
  photo_urls: string[];
  available_from: string | null;
  available_to: string | null;
  max_stay_months: number;
}

export interface ListingInput {
  title: string;
  description: string;
  city: string;
  neighbourhood: string;
  meals_included: boolean;
  amenities: string[];
  photo_urls: string[];
  rooms: RoomInput[];
}

export function parseListingInput(body: unknown): { value?: ListingInput; error?: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = str(b.title, 255);
  const description = str(b.description, 10000);
  const city = str(b.city, 100);
  if (!title || !description || !city) {
    return { error: 'Please fill in the homestay title, description, and city.' };
  }
  const amenities = stringList(b.amenities, 30, 100);
  if (!amenities) return { error: 'Invalid amenities list.' };
  const photo_urls = urlList(b.photo_urls, 20);
  if (!photo_urls) return { error: 'Photos must be valid http(s) links (max 20).' };

  if (!Array.isArray(b.rooms) || b.rooms.length < 1 || b.rooms.length > 20) {
    return { error: 'Please add at least one room (up to 20).' };
  }
  const rooms: RoomInput[] = [];
  for (const raw of b.rooms as Record<string, unknown>[]) {
    const roomTitle = str(raw?.title, 255);
    if (!roomTitle) return { error: 'Every room needs a title.' };
    const room_type = raw.room_type as RoomType;
    if (!ROOM_TYPES.includes(room_type)) return { error: `Room "${roomTitle}" has an invalid type.` };
    const beds = Number(raw.beds);
    if (!Number.isInteger(beds) || beds < 1 || beds > 20) {
      return { error: `Room "${roomTitle}" needs between 1 and 20 beds.` };
    }
    const price = Number(raw.price_per_month);
    if (!Number.isFinite(price) || price <= 0 || price > 100000) {
      return { error: `Room "${roomTitle}" needs a price greater than zero.` };
    }
    const roomPhotos = urlList(raw.photo_urls, 20);
    if (!roomPhotos) return { error: `Room "${roomTitle}" has an invalid photo link.` };
    const from = raw.available_from ? raw.available_from : null;
    const to = raw.available_to ? raw.available_to : null;
    if ((from !== null && !isDate(from)) || (to !== null && !isDate(to))) {
      return { error: `Room "${roomTitle}" has an invalid availability date.` };
    }
    if (from && to && to < from) {
      return { error: `Room "${roomTitle}": the end date is before the start date.` };
    }
    const maxStay = Number(raw.max_stay_months);
    if (!Number.isInteger(maxStay) || maxStay < 1 || maxStay > 60) {
      return { error: `Room "${roomTitle}" needs a maximum stay between 1 and 60 months.` };
    }
    rooms.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : null,
      title: roomTitle,
      description: str(raw.description, 5000),
      room_type,
      beds,
      price_per_month: price,
      photo_urls: roomPhotos,
      available_from: from as string | null,
      available_to: to as string | null,
      max_stay_months: maxStay,
    });
  }
  return {
    value: {
      title,
      description,
      city,
      neighbourhood: str(b.neighbourhood, 255),
      meals_included: b.meals_included === true,
      amenities,
      photo_urls,
      rooms,
    },
  };
}
