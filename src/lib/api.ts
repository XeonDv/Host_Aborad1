import type { Profile, UserType } from '@/lib/supabase';

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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getStoredSession();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: 'include' });
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
