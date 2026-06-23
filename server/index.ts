import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import {
  CreateCalendarEventError,
  createGoogleCalendarEvent,
} from './createCalendarEvent';
import {
  exchangeCodeForTokens,
  getGoogleAuthUrl,
} from './googleAuth';
import { ParseEventError, parseEvent } from './parseEvent';
import type { ParsedEvent } from './parseEvent';
import { resolveTimeZone } from './timeZone';

const app = express();
const PORT = process.env.PORT ?? 3001;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'meetli-dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

function isParsedEvent(value: unknown): value is ParsedEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Record<string, unknown>;

  return (
    typeof event.title === 'string' &&
    typeof event.date === 'string' &&
    typeof event.time === 'string' &&
    typeof event.duration === 'number' &&
    (event.calendar === 'personal' || event.calendar === 'family') &&
    (event.timeZone === undefined || typeof event.timeZone === 'string')
  );
}

app.get('/auth/google', (_req, res) => {
  try {
    res.redirect(getGoogleAuthUrl());
  } catch (err) {
    console.error('Google auth URL error:', err);
    res.status(500).json({ error: 'Google Calendar login is not configured.' });
  }
});

app.get('/auth/google/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : null;

  if (!code) {
    res.redirect(`${FRONTEND_URL}?auth=error`);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    req.session.googleTokens = tokens;
    res.redirect(`${FRONTEND_URL}?auth=success`);
  } catch (err) {
    console.error('Google auth callback error:', err);
    res.redirect(`${FRONTEND_URL}?auth=error`);
  }
});

app.get('/auth/status', (req, res) => {
  res.json({ authenticated: Boolean(req.session.googleTokens?.access_token) });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      res.status(500).json({ error: 'Could not sign out.' });
      return;
    }

    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

app.post('/parse', async (req, res) => {
  const { message, previousEvent, history, timeZone } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "message" field.' });
    return;
  }

  const trimmed = message.trim();
  const hasPreviousEvent = isParsedEvent(previousEvent);
  const minLength = hasPreviousEvent ? 2 : 10;

  if (trimmed.length < minLength) {
    res.status(422).json({
      error: hasPreviousEvent
        ? 'Please tell me what to change.'
        : 'Please provide more details so we can create your event.',
    });
    return;
  }

  const chatHistory = Array.isArray(history)
    ? history.filter(
        (entry: unknown): entry is { role: 'user' | 'assistant'; content: string } =>
          Boolean(
            entry &&
              typeof entry === 'object' &&
              (entry as { role?: string }).role &&
              ((entry as { role: string }).role === 'user' ||
                (entry as { role: string }).role === 'assistant') &&
              typeof (entry as { content?: unknown }).content === 'string',
          ),
      )
    : [];

  try {
    const event = await parseEvent(trimmed, {
      previousEvent: hasPreviousEvent ? previousEvent : undefined,
      history: chatHistory,
      timeZone:
        typeof timeZone === 'string' ? resolveTimeZone(timeZone) : undefined,
    });
    res.json(event);
  } catch (err) {
    if (err instanceof ParseEventError) {
      res.status(422).json({ error: err.message });
      return;
    }

    console.error('Parse error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.post('/calendar/events', async (req, res) => {
  const tokens = req.session.googleTokens;

  if (!tokens?.access_token) {
    res.status(401).json({ error: 'Sign in with Google to create calendar events.' });
    return;
  }

  if (!isParsedEvent(req.body)) {
    res.status(400).json({ error: 'Missing or invalid event details.' });
    return;
  }

  try {
    const created = await createGoogleCalendarEvent(tokens, req.body, {
      familyCalendarId: req.session.familyCalendarId,
    });

    if (created.familyCalendarId) {
      req.session.familyCalendarId = created.familyCalendarId;
    }

    res.json({ htmlLink: created.htmlLink, id: created.id });
  } catch (err) {
    if (err instanceof CreateCalendarEventError) {
      res.status(422).json({ error: err.message });
      return;
    }

    console.error('Calendar event error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
