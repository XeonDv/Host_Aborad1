import type {
  AdminBooking, AdminListing, AdminProfile, Booking, BookingWithRelations, Listing,
  ListingWithCount, Profile, PublicHost, Room, UserType,
} from '@/lib/types';

export interface ApiUser {
  id: string;
  email: string;
}

export interface ApiSession {
  token: string;
  user: ApiUser;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

const SESSION_KEY = 'hostabroad_session';

function getStoredSession(): ApiSession | null {
  const value = localStorage.getItem(SESSION_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as ApiSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveSession(session: ApiSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

function apiUrl(path: string): string {
  if (API_BASE) return `${API_BASE}${path}`;
  return path;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getStoredSession();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...init, headers, credentials: 'include' });
  } catch {
    throw new Error('Unable to connect to the server. Please try again.');
  }

  const body = await response.json().catch(() => ({})) as ApiResponse<T>;
  if (!response.ok) {
    throw new Error(body.error || body.message || 'The request could not be completed.');
  }
  return body.data as T;
}

export async function restoreSession(): Promise<{ session: ApiSession | null; profile: Profile | null }> {
  const session = getStoredSession();
  if (!session) return { session: null, profile: null };

  try {
    const result = await apiFetch<{ user: ApiUser; profile: Profile }>('/api/auth/session');
    const refreshedSession = { ...session, user: result.user };
    saveSession(refreshedSession);
    return { session: refreshedSession, profile: result.profile };
  } catch {
    clearStoredSession();
    return { session: null, profile: null };
  }
}

export async function signUpRequest(email: string, password: string, userType: UserType, fullName: string): Promise<{ session: ApiSession; profile: Profile }> {
  const result = await apiFetch<{ session: ApiSession; profile: Profile }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, userType, fullName }),
  });
  saveSession(result.session);
  return result;
}

export async function signInRequest(email: string, password: string): Promise<{ session: ApiSession; profile: Profile }> {
  const result = await apiFetch<{ session: ApiSession; profile: Profile }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveSession(result.session);
  return result;
}

export async function signOutRequest(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } finally {
    clearStoredSession();
  }
}

export function updateProfileRequest(userId: string, updates: Partial<Profile>): Promise<Profile> {
  return apiFetch<Profile>(`/api/profiles/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ---------- Homestays ----------

export interface ListingFilters {
  city?: string;
  roomType?: string;
  mealsOnly?: boolean;
  maxPrice?: number | '';
}

export function fetchListings(filters: ListingFilters = {}): Promise<ListingWithCount[]> {
  const params = new URLSearchParams();
  if (filters.city) params.set('city', filters.city);
  if (filters.roomType) params.set('room_type', filters.roomType);
  if (filters.mealsOnly) params.set('meals', 'true');
  if (filters.maxPrice !== undefined && filters.maxPrice !== '') params.set('max_price', String(filters.maxPrice));
  const qs = params.toString();
  return apiFetch<ListingWithCount[]>(`/api/listings${qs ? `?${qs}` : ''}`);
}

export function fetchListingDetail(id: string): Promise<{ listing: Listing; host: PublicHost | null; rooms: Room[] }> {
  return apiFetch(`/api/listings/${encodeURIComponent(id)}`);
}

export function fetchMyListings(): Promise<{ listings: Listing[]; rooms: Room[] }> {
  return apiFetch('/api/listings/mine');
}

export interface ListingPayload {
  title: string;
  description: string;
  city: string;
  neighbourhood: string;
  meals_included: boolean;
  amenities: string[];
  photo_urls: string[];
  rooms: {
    id?: string;
    title: string;
    description: string;
    room_type: Room['room_type'];
    beds: number;
    price_per_month: number;
    photo_urls: string[];
    available_from: string | null;
    available_to: string | null;
    max_stay_months: number;
  }[];
}

export function saveListing(listingId: string | undefined, payload: ListingPayload): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(listingId ? `/api/listings/${encodeURIComponent(listingId)}` : '/api/listings', {
    method: listingId ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteListing(listingId: string): Promise<null> {
  return apiFetch<null>(`/api/listings/${encodeURIComponent(listingId)}`, { method: 'DELETE' });
}

// ---------- Reservas ----------

export function fetchBookings(): Promise<BookingWithRelations[]> {
  return apiFetch<BookingWithRelations[]>('/api/bookings');
}

export function createBooking(input: {
  listing_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
}): Promise<Booking> {
  return apiFetch<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(input) });
}

export function updateBookingStatus(bookingId: string, status: Booking['status']): Promise<{ id: string; status: string }> {
  return apiFetch(`/api/bookings/${encodeURIComponent(bookingId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ---------- Admin ----------

export const adminApi = {
  profiles: () => apiFetch<AdminProfile[]>('/api/admin/profiles'),
  listings: () => apiFetch<AdminListing[]>('/api/admin/listings'),
  bookings: () => apiFetch<AdminBooking[]>('/api/admin/bookings'),
};

// ---------- Pago de la cuota de registro ----------

export function startRegistrationCheckout(): Promise<{ url?: string; alreadyPaid?: boolean }> {
  return apiFetch('/api/payments/registration/checkout', { method: 'POST' });
}

export function confirmRegistrationPayment(sessionId: string): Promise<{ paid: boolean }> {
  return apiFetch('/api/payments/registration/confirm', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}
