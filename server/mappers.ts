import type { RowDataPacket } from 'mysql2';

// Los DATETIME se guardan en UTC; los devolvemos como ISO para que
// new Date() funcione igual en todos los navegadores (incluido Safari).
export function iso(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
}

export function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function profileToJson(row: RowDataPacket) {
  return {
    id: row.id as string,
    user_type: row.user_type as 'student' | 'host' | 'admin',
    full_name: row.full_name as string,
    phone: (row.phone as string) ?? '',
    country: (row.country as string) ?? '',
    city: (row.city as string) ?? '',
    bio: (row.bio as string | null) ?? '',
    avatar_url: (row.avatar_url as string | null) ?? '',
    registration_paid: !!row.registration_paid,
    registration_fee_paid_at: iso(row.registration_fee_paid_at),
    created_at: iso(row.created_at) as string,
  };
}

// Lo único que otros usuarios pueden ver de un perfil (sin teléfono ni correo).
export function publicProfileToJson(row: RowDataPacket) {
  return {
    id: row.id as string,
    full_name: row.full_name as string,
    avatar_url: (row.avatar_url as string | null) ?? '',
    city: (row.city as string) ?? '',
    country: (row.country as string) ?? '',
    bio: (row.bio as string | null) ?? '',
  };
}

export function listingToJson(row: RowDataPacket) {
  return {
    id: row.id as string,
    host_id: row.host_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? '',
    city: row.city as string,
    neighbourhood: (row.neighbourhood as string | null) ?? '',
    price_per_month: Number(row.price_per_month),
    room_type: row.room_type as 'Private room' | 'Shared room' | 'Studio',
    meals_included: !!row.meals_included,
    amenities: parseStringArray(row.amenities),
    photo_urls: parseStringArray(row.photo_urls),
    available_from: (row.available_from as string | null) ?? null,
    available_to: (row.available_to as string | null) ?? null,
    max_stay_months: Number(row.max_stay_months),
    created_at: iso(row.created_at) as string,
    ...(row.room_count !== undefined ? { room_count: Number(row.room_count) } : {}),
  };
}

export function roomToJson(row: RowDataPacket) {
  return {
    id: row.id as string,
    listing_id: row.listing_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? '',
    room_type: row.room_type as 'Private room' | 'Shared room' | 'Studio',
    beds: Number(row.beds),
    price_per_month: Number(row.price_per_month),
    photo_urls: parseStringArray(row.photo_urls),
    available_from: (row.available_from as string | null) ?? null,
    available_to: (row.available_to as string | null) ?? null,
    max_stay_months: Number(row.max_stay_months),
    created_at: iso(row.created_at) as string,
  };
}

export function bookingToJson(row: RowDataPacket) {
  return {
    id: row.id as string,
    student_id: row.student_id as string,
    listing_id: row.listing_id as string,
    room_id: (row.room_id as string | null) ?? null,
    check_in: row.check_in as string,
    check_out: row.check_out as string,
    months: Number(row.months),
    total_amount: Number(row.total_amount),
    status: row.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
    stripe_session_id: (row.stripe_session_id as string) ?? '',
    created_at: iso(row.created_at) as string,
  };
}
