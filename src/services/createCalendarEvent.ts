import type { CalendarEvent } from '../types/event';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface CreatedCalendarEvent {
  htmlLink: string;
  id: string;
}

export async function createCalendarEvent(
  event: CalendarEvent,
): Promise<CreatedCalendarEvent> {
  const response = await fetch(`${API_BASE}/calendar/events`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });

  const data: CreatedCalendarEvent | { error?: string } = await response.json();

  if (!response.ok) {
    const message =
      'error' in data && data.error
        ? data.error
        : 'Something went wrong. Please try again.';
    throw new Error(message);
  }

  return data as CreatedCalendarEvent;
}
