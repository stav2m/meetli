import type { CalendarEvent } from '../types/event';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const PENDING_EVENT_KEY = 'meetli-pending-event';

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'Something went wrong. Please try again.');
  }

  return data;
}

export interface AuthStatus {
  authenticated: boolean;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetchJson<AuthStatus>('/auth/status');
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }

      await wait(300 * attempt);
    }
  }

  return { authenticated: false };
}

export function signInWithGoogle(pendingEvent?: CalendarEvent): void {
  if (pendingEvent) {
    sessionStorage.setItem(PENDING_EVENT_KEY, JSON.stringify(pendingEvent));
  }

  window.location.href = `${API_BASE}/auth/google`;
}

export function consumePendingEvent(): CalendarEvent | null {
  const raw = sessionStorage.getItem(PENDING_EVENT_KEY);

  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(PENDING_EVENT_KEY);

  try {
    return JSON.parse(raw) as CalendarEvent;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  await fetchJson<{ success: boolean }>('/auth/logout', { method: 'POST' });
}
