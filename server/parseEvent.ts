import OpenAI from 'openai';
import {
  formatDateInTimezone,
  formatTimeInTimezone,
  getNowInTimezone,
  resolveTimeZone,
} from './timeZone';

export type CalendarTarget = 'personal' | 'family';

export interface ParsedEvent {
  title: string;
  date: string;
  time: string;
  duration: number;
  calendar: CalendarTarget;
  timeZone: string;
}

export class ParseEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseEventError';
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const EVENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'A concise title for the calendar event',
    },
    date: {
      type: 'string',
      description:
        'Event start date in YYYY-MM-DD format, in the user timezone',
    },
    time: {
      type: 'string',
      description:
        'Event start time in 24-hour HH:MM format, in the user timezone',
    },
    duration: {
      type: 'number',
      description: 'Duration of the event in minutes',
    },
    calendar: {
      type: 'string',
      enum: ['personal', 'family'],
      description:
        'Use "family" when the user wants the event on a family or shared family calendar. Use "personal" when they mention their personal or own calendar, or when they do not specify.',
    },
  },
  required: ['title', 'date', 'time', 'duration', 'calendar'],
  additionalProperties: false,
} as const;

interface LlmEventDetails {
  title: string;
  date: string;
  time: string;
  duration: number;
  calendar: CalendarTarget;
}

interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

interface ParseEventOptions {
  previousEvent?: ParsedEvent;
  history?: ChatHistoryEntry[];
  timeZone?: string;
}

function buildSystemPrompt(
  timeZone: string,
  previousEvent?: ParsedEvent,
): string {
  const now = getNowInTimezone(timeZone);
  const currentDate = formatDateInTimezone(now, timeZone);
  const currentTime = formatTimeInTimezone(now, timeZone);
  const weekday = now.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
  });

  const previousEventContext = previousEvent
    ? `\nThe user may be refining a previous event. Previous event: ${JSON.stringify(previousEvent)}.
Apply only the changes they mention in their latest message; keep other fields unless they say otherwise.`
    : '';

  return `You extract calendar event details from natural language messages in English or Hebrew.

User timezone: ${timeZone}
Current local datetime for this user: ${weekday}, ${currentDate} ${currentTime}

Resolve relative dates and times against that reference. Examples:
- "tomorrow", "מחר", "Friday", "שישי", "next Tuesday" -> compute the correct YYYY-MM-DD in ${timeZone}
- "at 3", "ב-3", "בשלוש" without am/pm or morning/evening cues -> treat as afternoon (15:00) for calendar events
- "at 9", "ב-9" without cues -> treat as morning (09:00)
- Explicit times like "15:00", "3pm", "בערב", "בבוקר", "in the morning" -> follow the user's intent

Always return:
- date as YYYY-MM-DD
- time as HH:MM in 24-hour format
Both must be in the user's timezone (${timeZone}).

Infer a concise event title and a reasonable duration when not specified
(default 60 minutes for meetings, 30 minutes for reminders).
Choose "family" when the user asks to add the event to a family calendar,
shared family schedule, or similar. Choose "personal" when they ask for their
personal or own calendar, or when they do not specify a calendar.
Do not include calendar-choice wording in the event title.
When the user sends a follow-up correction, update only what they changed.
Return valid JSON only.${previousEventContext}`;
}

function validateEventDetails(details: LlmEventDetails): void {
  if (!DATE_PATTERN.test(details.date)) {
    throw new ParseEventError(
      'Could not determine a valid event date. Please include when the event should happen.',
    );
  }

  if (!TIME_PATTERN.test(details.time)) {
    throw new ParseEventError(
      'Could not determine a valid event time. Please include when the event should happen.',
    );
  }
}

export async function parseEvent(
  message: string,
  options: ParseEventOptions = {},
): Promise<ParsedEvent> {
  const { previousEvent, history = [], timeZone: requestedTimeZone } = options;
  const timeZone = resolveTimeZone(requestedTimeZone);

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ParseEventError('OpenAI API key is not configured.');
  }

  const openai = new OpenAI({ apiKey });

  const conversationMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    ...history.map((entry) => ({
      role: entry.role,
      content: entry.content,
    })),
    {
      role: 'user',
      content: message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(timeZone, previousEvent),
      },
      ...conversationMessages,
    ],
    temperature: 0,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'calendar_event',
        strict: true,
        schema: EVENT_JSON_SCHEMA,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new ParseEventError(
      'Unable to parse event details. Please try rephrasing your request.',
    );
  }

  let details: LlmEventDetails;

  try {
    details = JSON.parse(content) as LlmEventDetails;
  } catch {
    throw new ParseEventError(
      'Unable to parse event details. Please try rephrasing your request.',
    );
  }

  validateEventDetails(details);

  return {
    title: details.title,
    date: details.date,
    time: details.time,
    duration: details.duration,
    calendar: details.calendar,
    timeZone,
  };
}
