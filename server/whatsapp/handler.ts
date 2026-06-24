import {
  CreateCalendarEventError,
  createGoogleCalendarEvent,
} from '../createCalendarEvent';
import { ParseEventError, parseEvent } from '../parseEvent';
import { downloadMedia, sendEventSummary, sendTextMessage } from './api';
import { TranscribeAudioError, transcribeAudio } from './transcribeAudio';
import { formatEventSummary } from './formatEvent';
import { resolveLocale, type WhatsAppLocale } from './detectLocale';
import {
  createWhatsAppTranslator,
  translateWhatsAppError,
} from './i18n';
import {
  getWhatsAppUser,
  isDuplicateMessage,
  saveWhatsAppUser,
  setWhatsAppFamilyCalendarId,
  type WhatsAppUser,
} from './store';

const ADD_COMMANDS = new Set([
  'add',
  'yes',
  'confirm',
  'add to calendar',
  'add it',
  'הוסף',
  'אישור',
]);

const RESET_COMMANDS = new Set(['new', 'reset', 'start over', 'cancel', 'חדש']);

function getBackendUrl(): string {
  return process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
}

function buildGoogleAuthUrl(waId: string): string {
  const encoded = encodeURIComponent(waId);
  return `${getBackendUrl()}/auth/google/whatsapp?waId=${encoded}`;
}

function isAddCommand(text: string): boolean {
  return ADD_COMMANDS.has(text.trim().toLowerCase());
}

function isResetCommand(text: string): boolean {
  return RESET_COMMANDS.has(text.trim().toLowerCase());
}

async function updateUserLocale(
  user: WhatsAppUser,
  text?: string,
): Promise<WhatsAppLocale> {
  user.locale = resolveLocale(user.locale, text);
  return user.locale;
}

async function handleAddEvent(waId: string): Promise<void> {
  const user = await getWhatsAppUser(waId);
  const locale = user.locale;
  const t = createWhatsAppTranslator(locale);

  if (!user.pendingEvent) {
    await sendTextMessage(waId, t('whatsapp.noEventToAdd'));
    return;
  }

  if (!user.googleTokens?.access_token) {
    const authUrl = buildGoogleAuthUrl(waId);
    await sendTextMessage(
      waId,
      t('whatsapp.signInToAdd', { url: authUrl }),
    );
    return;
  }

  try {
    const created = await createGoogleCalendarEvent(
      user.googleTokens,
      user.pendingEvent,
      { familyCalendarId: user.familyCalendarId },
    );

    if (created.familyCalendarId) {
      await setWhatsAppFamilyCalendarId(waId, created.familyCalendarId);
    }

    user.pendingEvent = undefined;
    user.history = [];
    await saveWhatsAppUser(waId, user);

    await sendTextMessage(
      waId,
      t('whatsapp.addedToCalendar', { link: created.htmlLink }),
    );
  } catch (err) {
    const message =
      err instanceof CreateCalendarEventError
        ? translateWhatsAppError(err.message, locale)
        : t('whatsapp.createFailed');

    await sendTextMessage(waId, message);
  }
}

async function handleParseMessage(waId: string, text: string): Promise<void> {
  const user = await getWhatsAppUser(waId);
  const locale = await updateUserLocale(user, text);
  const t = createWhatsAppTranslator(locale);
  const trimmed = text.trim();
  const hasPreviousEvent = Boolean(user.pendingEvent);
  const minLength = hasPreviousEvent ? 2 : 10;

  if (trimmed.length < minLength) {
    await sendTextMessage(
      waId,
      hasPreviousEvent
        ? t('whatsapp.tooShortFollowUp')
        : t('whatsapp.tooShortInitial'),
    );
    await saveWhatsAppUser(waId, user);
    return;
  }

  try {
    const event = await parseEvent(trimmed, {
      previousEvent: user.pendingEvent,
      history: user.history,
      timeZone: user.timeZone,
    });

    user.pendingEvent = event;
    user.history.push({ role: 'user', content: trimmed });
    user.history.push({
      role: 'assistant',
      content: formatEventSummary(event, locale),
    });
    await saveWhatsAppUser(waId, user);

    const summary = formatEventSummary(event, locale);
    const authenticated = Boolean(user.googleTokens?.access_token);

    await sendEventSummary(waId, summary, {
      showAddButton: authenticated,
      addButtonTitle: t('whatsapp.addButton'),
    });

    if (!authenticated) {
      const authUrl = buildGoogleAuthUrl(waId);
      await sendTextMessage(waId, t('whatsapp.signInFirst', { url: authUrl }));
    }
  } catch (err) {
    const message =
      err instanceof ParseEventError
        ? translateWhatsAppError(err.message, locale)
        : t('errors.generic');

    await sendTextMessage(waId, message);
    await saveWhatsAppUser(waId, user);
  }
}

async function handleIncomingAudio(waId: string, mediaId: string): Promise<void> {
  const user = await getWhatsAppUser(waId);
  const locale = user.locale;
  const t = createWhatsAppTranslator(locale);

  try {
    const media = await downloadMedia(mediaId);
    const text = await transcribeAudio(media.data, media.mimeType);

    if (!text) {
      await sendTextMessage(waId, t('whatsapp.voiceNotUnderstood'));
      return;
    }

    await handleIncomingText(waId, text);
  } catch (err) {
    console.error('Voice message processing error:', err);

    const message =
      err instanceof TranscribeAudioError
        ? err.message
        : t('whatsapp.voiceProcessFailed');

    await sendTextMessage(waId, message);
  }
}

export async function handleIncomingText(waId: string, text: string): Promise<void> {
  const user = await getWhatsAppUser(waId);
  const locale = await updateUserLocale(user, text);
  const t = createWhatsAppTranslator(locale);

  if (isResetCommand(text)) {
    user.pendingEvent = undefined;
    user.history = [];
    await saveWhatsAppUser(waId, user);
    await sendTextMessage(waId, t('whatsapp.reset'));
    return;
  }

  if (isAddCommand(text)) {
    await saveWhatsAppUser(waId, user);
    await handleAddEvent(waId);
    return;
  }

  await handleParseMessage(waId, text);
}

export async function handleIncomingButton(
  waId: string,
  buttonId: string,
): Promise<void> {
  const user = await getWhatsAppUser(waId);
  const t = createWhatsAppTranslator(user.locale);

  if (buttonId === 'add_event') {
    await handleAddEvent(waId);
    return;
  }

  await sendTextMessage(waId, t('whatsapp.unknownAction'));
}

interface WhatsAppWebhookMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  audio?: { id: string; mime_type?: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
  };
}

export async function processWebhookPayload(payload: unknown): Promise<void> {
  if (
    !payload ||
    typeof payload !== 'object' ||
    (payload as { object?: string }).object !== 'whatsapp_business_account'
  ) {
    return;
  }

  const entries = (payload as { entry?: unknown[] }).entry ?? [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const changes = (entry as { changes?: unknown[] }).changes ?? [];

    for (const change of changes) {
      if (!change || typeof change !== 'object') {
        continue;
      }

      const value = (change as { value?: { messages?: WhatsAppWebhookMessage[] } })
        .value;
      const messages = value?.messages ?? [];

      for (const message of messages) {
        const waId = message.from;
        const user = await getWhatsAppUser(waId);

        if (isDuplicateMessage(user, message.id)) {
          await saveWhatsAppUser(waId, user);
          continue;
        }

        await saveWhatsAppUser(waId, user);

        if (message.type === 'text' && message.text?.body) {
          await handleIncomingText(waId, message.text.body);
          continue;
        }

        if (message.type === 'audio' && message.audio?.id) {
          await handleIncomingAudio(waId, message.audio.id);
          continue;
        }

        if (
          message.type === 'interactive' &&
          message.interactive?.type === 'button_reply' &&
          message.interactive.button_reply?.id
        ) {
          await handleIncomingButton(
            waId,
            message.interactive.button_reply.id,
          );
        }
      }
    }
  }
}

export async function notifyWhatsAppAuthSuccess(waId: string): Promise<void> {
  const user = await getWhatsAppUser(waId);
  const locale = user.locale;
  const t = createWhatsAppTranslator(locale);

  if (user.pendingEvent) {
    await sendTextMessage(waId, t('whatsapp.authSuccessWithEvent'));
    await sendEventSummary(waId, formatEventSummary(user.pendingEvent, locale), {
      showAddButton: true,
      addButtonTitle: t('whatsapp.addButton'),
    });
    return;
  }

  await sendTextMessage(waId, t('whatsapp.authSuccess'));
}
