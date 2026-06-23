import type { ChatHistoryEntry } from '../types/chat';
import type { CalendarEvent } from '../types/event';
import i18n from '../i18n';
import { translateError } from '../utils/translateError';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function getClientTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export interface ExtractEventContext {
  previousEvent?: CalendarEvent | null;
  history?: ChatHistoryEntry[];
}

export async function extractEventFromText(
  input: string,
  context?: ExtractEventContext,
): Promise<CalendarEvent> {
  const response = await fetch(`${API_BASE}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: input,
      previousEvent: context?.previousEvent ?? undefined,
      history: context?.history ?? [],
      timeZone: getClientTimeZone(),
    }),
  });

  const data: CalendarEvent | { error?: string } = await response.json();

  if (!response.ok) {
    const message =
      'error' in data && data.error ? data.error : i18n.t('errors.generic');
    throw new Error(translateError(message, i18n.t.bind(i18n)));
  }

  return data as CalendarEvent;
}
