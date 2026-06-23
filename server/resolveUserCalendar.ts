import { google } from 'googleapis';
import OpenAI from 'openai';
import { getAuthenticatedClient, type GoogleTokens } from './googleAuth';
import type { CalendarTarget } from './parseEvent';

const WRITABLE_ROLES = new Set(['writer', 'owner']);

const CALENDAR_MATCH_SCHEMA = {
  type: 'object',
  properties: {
    calendarId: {
      type: 'string',
      description:
        'The id of the chosen calendar. Must be one of the ids from the provided list.',
    },
  },
  required: ['calendarId'],
  additionalProperties: false,
} as const;

export class ResolveCalendarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResolveCalendarError';
  }
}

export interface UserCalendar {
  id: string;
  name: string;
  isPrimary: boolean;
}

function calendarDisplayName(entry: {
  summary?: string | null;
  summaryOverride?: string | null;
}): string {
  return (entry.summaryOverride ?? entry.summary ?? 'Untitled calendar').trim();
}

export async function listWritableCalendars(
  tokens: GoogleTokens,
): Promise<UserCalendar[]> {
  const auth = getAuthenticatedClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });
  const calendars: UserCalendar[] = [];
  let pageToken: string | undefined;

  do {
    const response = await calendar.calendarList.list({
      pageToken,
      maxResults: 250,
      minAccessRole: 'writer',
    });

    for (const item of response.data.items ?? []) {
      if (item.deleted || !item.id) {
        continue;
      }

      if (!item.accessRole || !WRITABLE_ROLES.has(item.accessRole)) {
        continue;
      }

      calendars.push({
        id: item.id,
        name: calendarDisplayName(item),
        isPrimary: Boolean(item.primary),
      });
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return calendars;
}

async function matchCalendarWithAi(
  target: CalendarTarget,
  calendars: UserCalendar[],
): Promise<string> {
  if (calendars.length === 0) {
    throw new ResolveCalendarError(
      'No writable calendars were found on your Google account.',
    );
  }

  if (target === 'personal') {
    const primary = calendars.find((calendar) => calendar.isPrimary);
    return primary?.id ?? calendars[0].id;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ResolveCalendarError('OpenAI API key is not configured.');
  }

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You choose which Google Calendar should receive a new event.
The user asked for the "${target}" calendar.
Pick the single best matching calendar from the provided list.
For "family", choose a shared household or family calendar even if its name is in Hebrew or another language (for example "היומן המשפחתי").
Do not choose the user's primary personal calendar for "family" unless no family calendar exists.
Return valid JSON only.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          intent: target,
          calendars: calendars.map(({ id, name, isPrimary }) => ({
            id,
            name,
            isPrimary,
          })),
        }),
      },
    ],
    temperature: 0,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'calendar_match',
        strict: true,
        schema: CALENDAR_MATCH_SCHEMA,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new ResolveCalendarError(
      'Could not determine which calendar to use. Please try again.',
    );
  }

  let calendarId: string;

  try {
    calendarId = (JSON.parse(content) as { calendarId: string }).calendarId;
  } catch {
    throw new ResolveCalendarError(
      'Could not determine which calendar to use. Please try again.',
    );
  }

  const matched = calendars.find((calendar) => calendar.id === calendarId);

  if (!matched) {
    throw new ResolveCalendarError(
      'Could not match your request to one of your Google calendars.',
    );
  }

  if (target === 'family' && matched.isPrimary && calendars.some((c) => !c.isPrimary)) {
    throw new ResolveCalendarError(
      'Could not find a family calendar on your Google account. Make sure your family calendar is visible in Google Calendar.',
    );
  }

  return matched.id;
}

export async function resolveUserCalendarId(
  tokens: GoogleTokens,
  target: CalendarTarget,
  cachedFamilyCalendarId?: string,
): Promise<{ calendarId: string; familyCalendarId?: string }> {
  if (target === 'personal') {
    return { calendarId: 'primary' };
  }

  if (cachedFamilyCalendarId) {
    return {
      calendarId: cachedFamilyCalendarId,
      familyCalendarId: cachedFamilyCalendarId,
    };
  }

  const calendars = await listWritableCalendars(tokens);
  const familyCalendarId = await matchCalendarWithAi(target, calendars);

  return { calendarId: familyCalendarId, familyCalendarId };
}
