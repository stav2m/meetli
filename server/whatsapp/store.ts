import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GoogleTokens } from '../googleAuth';
import type { ParsedEvent } from '../parseEvent';
import type { WhatsAppLocale } from './detectLocale';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface WhatsAppUser {
  history: ChatTurn[];
  pendingEvent?: ParsedEvent;
  googleTokens?: GoogleTokens;
  familyCalendarId?: string;
  timeZone: string;
  locale: WhatsAppLocale;
  processedMessageIds: string[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'whatsapp-users.json');

const users = new Map<string, WhatsAppUser>();
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) {
    return;
  }

  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, WhatsAppUser>;

    for (const [waId, user] of Object.entries(parsed)) {
      users.set(waId, user);
    }
  } catch {
    // No store file yet — start fresh.
  }

  loaded = true;
}

async function persist(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const data = Object.fromEntries(users.entries());
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function getWhatsAppUser(waId: string): Promise<WhatsAppUser> {
  await ensureLoaded();

  let user = users.get(waId);

  if (!user) {
    user = {
      history: [],
      timeZone: 'Asia/Jerusalem',
      locale: 'en',
      processedMessageIds: [],
    };
    users.set(waId, user);
  } else if (!user.locale) {
    user.locale = 'en';
  }

  return user;
}

export async function saveWhatsAppUser(
  waId: string,
  user: WhatsAppUser,
): Promise<void> {
  await ensureLoaded();
  users.set(waId, user);
  await persist();
}

export async function setWhatsAppTokens(
  waId: string,
  tokens: GoogleTokens,
): Promise<void> {
  const user = await getWhatsAppUser(waId);
  user.googleTokens = tokens;
  await saveWhatsAppUser(waId, user);
}

export async function setWhatsAppFamilyCalendarId(
  waId: string,
  familyCalendarId: string,
): Promise<void> {
  const user = await getWhatsAppUser(waId);
  user.familyCalendarId = familyCalendarId;
  await saveWhatsAppUser(waId, user);
}

export function isDuplicateMessage(user: WhatsAppUser, messageId: string): boolean {
  if (user.processedMessageIds.includes(messageId)) {
    return true;
  }

  user.processedMessageIds.push(messageId);

  if (user.processedMessageIds.length > 50) {
    user.processedMessageIds = user.processedMessageIds.slice(-50);
  }

  return false;
}
