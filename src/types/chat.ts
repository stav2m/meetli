import type { CalendarEvent } from './event';

export interface UserChatMessage {
  id: string;
  role: 'user';
  content: string;
}

export interface AssistantEventMessage {
  id: string;
  role: 'assistant';
  kind: 'event';
  event: CalendarEvent;
  creating?: boolean;
  createdLink?: string | null;
  createError?: string | null;
}

export interface AssistantErrorMessage {
  id: string;
  role: 'assistant';
  kind: 'error';
  content: string;
}

export type ChatMessage =
  | UserChatMessage
  | AssistantEventMessage
  | AssistantErrorMessage;

export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}
