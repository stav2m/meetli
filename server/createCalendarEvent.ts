import { google } from 'googleapis';
import {
  getAuthenticatedClient,
  type GoogleTokens,
} from './googleAuth';
import { resolveTimeZone } from './timeZone';
import {
  ResolveCalendarError,
  resolveUserCalendarId,
} from './resolveUserCalendar';
import type { ParsedEvent } from './parseEvent';

export interface CreateCalendarEventResult {
  htmlLink: string;
  id: string;
  familyCalendarId?: string;
}

export class CreateCalendarEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreateCalendarEventError';
  }
}

function addMinutes(date: string, time: string, minutes: number) {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, mins] = time.split(':').map(Number);
  const start = new Date(year, month - 1, day, hours, mins);
  const end = new Date(start.getTime() + minutes * 60 * 1000);

  const endDate = [
    end.getFullYear(),
    String(end.getMonth() + 1).padStart(2, '0'),
    String(end.getDate()).padStart(2, '0'),
  ].join('-');

  const endTime = [
    String(end.getHours()).padStart(2, '0'),
    String(end.getMinutes()).padStart(2, '0'),
  ].join(':');

  return { date: endDate, time: endTime };
}

export async function createGoogleCalendarEvent(
  tokens: GoogleTokens,
  event: ParsedEvent,
  options?: { familyCalendarId?: string },
): Promise<CreateCalendarEventResult> {
  const auth = getAuthenticatedClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });
  const end = addMinutes(event.date, event.time, event.duration);
  const timeZone = resolveTimeZone(event.timeZone);

  try {
    const { calendarId, familyCalendarId } = await resolveUserCalendarId(
      tokens,
      event.calendar,
      options?.familyCalendarId,
    );

    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.title,
        start: {
          dateTime: `${event.date}T${event.time}:00`,
          timeZone,
        },
        end: {
          dateTime: `${end.date}T${end.time}:00`,
          timeZone,
        },
      },
    });

    const htmlLink = response.data.htmlLink;
    const id = response.data.id;

    if (!htmlLink || !id) {
      throw new CreateCalendarEventError(
        'Google Calendar did not return event details.',
      );
    }

    return { htmlLink, id, familyCalendarId };
  } catch (err) {
    if (
      err instanceof CreateCalendarEventError ||
      err instanceof ResolveCalendarError
    ) {
      throw new CreateCalendarEventError(
        err instanceof Error ? err.message : 'Failed to create calendar event.',
      );
    }

    const message =
      err instanceof Error ? err.message : 'Failed to create calendar event.';

    throw new CreateCalendarEventError(message);
  }
}
